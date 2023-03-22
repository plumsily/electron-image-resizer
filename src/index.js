const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const resizeImg = require("resize-img");

//Initialize global scope for mainwindow
let mainWindow;

//Check if the platform is a mac or windows
const isMac = process.platform === "darwin";

//Check if in development or production to show devtools
const isDev = process.env.NODE_ENV !== "production";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

//Create main window
const createMainWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: "Image Resizer",
    width: isDev ? 1000 : 500,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  await mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open the DevTools if in dev environment
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

//Create about window
const createAboutWindow = () => {
  // Create the browser window.
  const aboutWindow = new BrowserWindow({
    title: "About Image Resizer",
    width: 300,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  aboutWindow.loadFile(path.join(__dirname, "about.html"));
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// app.on("ready", createMainWindow);
app.whenReady().then(() => {
  createMainWindow();

  // Implement menu
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  //Remove mainwindow from memory on close
  mainWindow.on("closed", () => (mainWindow = null));

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

//Menu template
const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: "fileMenu",
  },
  ...(!isMac
    ? [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
];

//Respond to ipcRenderer resize
ipcMain.on("image:resize", (e, options) => {
  options.dest = path.join(os.homedir(), "imageresizer");
  resizeImage(options);
});

//Resize the image
async function resizeImage({ imgPath, width, height, dest }) {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height,
    });

    //Create filename
    const filename = path.basename(imgPath);

    //Create dest folder if not exists
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    //Write file to dest
    fs.writeFileSync(path.join(dest, filename), newPath);

    //Send success to renderer
    mainWindow.webContents.send("image:done");

    //Open dest folder
    shell.openPath(dest);
  } catch (error) {
    console.log(error);
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
