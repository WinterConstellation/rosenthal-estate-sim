const { app, BrowserWindow } = require("electron");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const projectRoot = process.cwd();
const token = "script-edit-ui-test";

function moduleUrl(relativePath) {
  return pathToFileURL(join(projectRoot, relativePath)).href;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForScrollableList(win) {
  await win.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        const list = document.querySelector("#entry-list");
        const rail = document.querySelector("#entry-scrollbar");
        const buttons = document.querySelectorAll(".entry-button").length;
        if (list && rail && buttons > 0 && list.scrollHeight > list.clientHeight) {
          resolve(true);
          return;
        }
        if (Date.now() - startedAt > 5000) {
          reject(new Error("Timed out waiting for a scrollable script edit list"));
          return;
        }
        setTimeout(tick, 50);
      };
      tick();
    })
  `);
}

async function readScrollState(win) {
  return win.webContents.executeJavaScript(`
    (() => {
      const list = document.querySelector("#entry-list");
      const rail = document.querySelector("#entry-scrollbar");
      const thumb = document.querySelector("#entry-scrollbar-thumb");
      const railRect = rail.getBoundingClientRect();
      const thumbRect = thumb.getBoundingClientRect();
      return {
        scrollTop: list.scrollTop,
        maxScroll: list.scrollHeight - list.clientHeight,
        listClientHeight: list.clientHeight,
        listScrollHeight: list.scrollHeight,
        nativeScrollbar: {
          width: getComputedStyle(list, "::-webkit-scrollbar").width,
          height: getComputedStyle(list, "::-webkit-scrollbar").height,
        },
        rail: { x: railRect.x, y: railRect.y, width: railRect.width, height: railRect.height },
        thumb: { x: thumbRect.x, y: thumbRect.y, width: thumbRect.width, height: thumbRect.height },
      };
    })()
  `);
}

async function readFolderState(win) {
  return win.webContents.executeJavaScript(`
    (() => ({
      folders: document.querySelectorAll(".entry-folder").length,
      nestedFolders: document.querySelectorAll(".entry-folder .entry-folder").length,
      depthOneFolders: document.querySelectorAll('.entry-folder[data-depth="1"]').length,
    }))()
  `);
}

async function main() {
  const [{ writeScriptEditIndex }, { createScriptEditServer }] = await Promise.all([
    import(moduleUrl("scripts/script-edit/indexGenerator.mjs")),
    import(moduleUrl("scripts/script-edit/server.mjs")),
  ]);
  await writeScriptEditIndex(projectRoot);
  const server = createScriptEditServer({ projectRoot, token, port: 0 });
  let win;
  try {
    const address = await server.start();
    await app.whenReady();
    win = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      webPreferences: { contextIsolation: true },
    });
    await win.loadURL(`http://${address.host}:${address.port}/?token=${token}&v=ui-scroll-verify`);
    await waitForScrollableList(win);
    const folderState = await readFolderState(win);
    if (folderState.nestedFolders <= 0 || folderState.depthOneFolders <= 0) {
      throw new Error("Nested script edit folders were not rendered");
    }
    const selectionScroll = await win.webContents.executeJavaScript(`
      (() => {
        const list = document.querySelector("#entry-list");
        for (const folder of document.querySelectorAll(".entry-folder")) folder.open = true;
        list.scrollTop = Math.floor((list.scrollHeight - list.clientHeight) * 0.55);
        const before = list.scrollTop;
        const listRect = list.getBoundingClientRect();
        const button = [...document.querySelectorAll(".entry-button")].find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.top >= listRect.top && rect.bottom <= listRect.bottom;
        });
        if (!button) throw new Error("No visible entry button found after opening folders");
        button.click();
        return { before, id: button.dataset.entryId };
      })()
    `);
    await wait(150);
    const afterSelectionScrollTop = await win.webContents.executeJavaScript(`
      document.querySelector("#entry-list").scrollTop
    `);
    if (Math.abs(afterSelectionScrollTop - selectionScroll.before) > 2) {
      throw new Error(`Selecting entry changed scrollTop from ${selectionScroll.before} to ${afterSelectionScrollTop}`);
    }

    await win.webContents.executeJavaScript(`document.querySelector("#entry-list").scrollTop = 0`);
    await wait(100);

    const before = await readScrollState(win);
    if (!["0px", "0"].includes(before.nativeScrollbar.width)) {
      throw new Error(`Native entry list scrollbar is still visible: ${before.nativeScrollbar.width}`);
    }
    const clickX = Math.round(before.rail.x + before.rail.width / 2);
    const clickY = Math.round(before.rail.y + before.rail.height * 0.75);
    win.webContents.sendInputEvent({ type: "mouseMove", x: clickX, y: clickY });
    win.webContents.sendInputEvent({ type: "mouseDown", x: clickX, y: clickY, button: "left", clickCount: 1 });
    win.webContents.sendInputEvent({ type: "mouseUp", x: clickX, y: clickY, button: "left", clickCount: 1 });
    await wait(150);

    const afterClick = await readScrollState(win);
    const dragX = Math.round(afterClick.thumb.x + afterClick.thumb.width / 2);
    const dragStartY = Math.round(afterClick.thumb.y + afterClick.thumb.height / 2);
    const dragEndY = Math.round(before.rail.y + before.rail.height * 0.9);
    win.webContents.sendInputEvent({ type: "mouseMove", x: dragX, y: dragStartY });
    win.webContents.sendInputEvent({ type: "mouseDown", x: dragX, y: dragStartY, button: "left", clickCount: 1 });
    win.webContents.sendInputEvent({ type: "mouseMove", x: dragX, y: dragEndY });
    win.webContents.sendInputEvent({ type: "mouseUp", x: dragX, y: dragEndY, button: "left", clickCount: 1 });
    await wait(150);

    const afterDrag = await readScrollState(win);
    if (!(afterClick.scrollTop > before.scrollTop)) {
      throw new Error("Rail click did not move entry list scrollTop");
    }
    if (!(afterDrag.scrollTop > afterClick.scrollTop)) {
      throw new Error("Rail drag did not move entry list scrollTop farther");
    }
    console.log(JSON.stringify({
      before: before.scrollTop,
      afterClick: afterClick.scrollTop,
      afterDrag: afterDrag.scrollTop,
      maxScroll: before.maxScroll,
    }, null, 2));
    console.log("Script edit UI verification passed.");
  } finally {
    if (win) win.destroy();
    await server.close();
    app.quit();
  }
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
