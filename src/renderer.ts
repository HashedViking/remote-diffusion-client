const api = (window as any).api;

let dotsStatus = {
  keyRegistrationStatus: false,
  sdWebUIStatus: false,
  remoteServerStatus: false,
};

let hasStarted = false;

document.getElementById("register")!.addEventListener("click", () => {
  api.send("register-new-key");
});

document.getElementById("start")!.addEventListener("click", () => {
  if (hasStarted) {
    api.send("stop-server");
  } else {
    api.send("start-server");
  }
});
api.receive("server-started", (data: { status: string }) => {
  hasStarted = true;
  document.getElementById("start")!.textContent = "Stop";
  document.getElementById("status")!.textContent = data.status;
  const startButton = document.getElementById("start")!;
  startButton.innerHTML = '<i class="fas fa-stop"></i> Stop';
});
api.receive("server-stopped", (data: { status: string }) => {
  hasStarted = false;
  document.getElementById("start")!.textContent = "Start";
  document.getElementById("status")!.textContent = data.status;
  const startButton = document.getElementById("start")!;
  startButton.innerHTML = '<i class="fas fa-play"></i> Start';
});

// document.getElementById("copy")!.addEventListener("click", () => {
//   api.send("copy-key");
// });

api.receive("key-updated", (data: { key: string; status: string }) => {
  (document.getElementById("clientKey")! as HTMLInputElement).value = data.key;
  document.getElementById("status")!.textContent = data.status;
});

api.receive("status-updated", (data: { status: string }) => {
  document.getElementById("status")!.textContent = data.status;
});

// api.receive("key-copied", () => {
//   const copyButton = document.getElementById("copy")!;
//   copyButton.innerHTML = '<i class="fas fa-copy"></i> Copied!';
//   setTimeout(() => {
//     copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy Key';
//   }, 1000);
// });

// document.getElementById('close-btn')!.addEventListener('click', () => {
//   window.close();
// });

api.send("load-path");
api.receive("load-path-reply", (path: string) => {
  (document.getElementById("folderPath") as HTMLInputElement).value = path;
});
api.send("load-sdwebui-script-path");
api.receive("load-sdwebui-script-path-reply", (script: string) => {
  (document.getElementById("sdWebUIStartScriptPath") as HTMLInputElement).value = script;
});

api.send("load-client-key");
api.receive("load-client-key-reply", (key: string) => {
  console.log("key: " + key);
  (document.getElementById("clientKey")! as HTMLInputElement).value = key;
});
api.send("load-auth-data");
api.receive("load-auth-data-reply", (data: { username: string; password: string }) => {
  (document.getElementById("username") as HTMLInputElement).value = data.username;
  (document.getElementById("password") as HTMLInputElement).value = data.password;
});

document
  .getElementById("scriptSelector")!
  .addEventListener("click", function (e) {
    e.preventDefault();
    api.send("open-file-dialog");
  });

document
  .getElementById("folderSelector")!
  .addEventListener("click", function (e) {
    e.preventDefault();
    api.send("open-directory-dialog");
  });

api.receive("selected-directory", (path: string) => {
  console.log(path);
  (document.getElementById("folderPath") as HTMLInputElement).value = path;
});

api.receive("selected-file", (path: string) => {
  console.log(path);
  (document.getElementById("sdWebUIStartScriptPath") as HTMLInputElement).value = path;
});

api.receive("dots-changed", (status: any) => {
  dotsStatus = status;
  updateStatusDots();
});

document.getElementById("allowRemoteRead")!.addEventListener("click", () => {
  api.send("allow-remote-read");
});

document.getElementById("allowOverwriting")!.addEventListener("click", () => {
  api.send("allow-overwriting");
});

api.receive("allow-remote-read-reply", (value: boolean) => {
  (document.getElementById("allowRemoteRead") as HTMLInputElement).checked = value;
});
api.send("load-allow-remote-read");

api.receive("allow-overwriting-reply", (value: boolean) => {
  (document.getElementById("allowOverwriting") as HTMLInputElement).checked = value;
});
api.send("load-allow-overwriting");

// add auth-container event listener to send auth data to main process when Set button is clicked
document.getElementById("set-auth")!.addEventListener("click", () => {
  const username = (document.getElementById("username") as HTMLInputElement).value;
  const password = (document.getElementById("password") as HTMLInputElement).value;
  const authData = { username, password };
  api.send("set-auth-data", authData);
});

function updateStatusDots() {
  const keyRegistrationStatus = dotsStatus.keyRegistrationStatus;
  const sdWebUIStatus = dotsStatus.sdWebUIStatus;
  const remoteServerStatus = dotsStatus.remoteServerStatus;

  const sdWebUIStatusTitle = document.getElementById("sdwebui-status");
  const remoteServerStatusTitle = document.getElementById("server-status");

  sdWebUIStatusTitle.textContent = sdWebUIStatus ? "Online" : "Offline";
  sdWebUIStatusTitle.style.color = sdWebUIStatus ? "#AAD160" : "gray";
  remoteServerStatusTitle.textContent = remoteServerStatus ? "Online" : "Offline";
  remoteServerStatusTitle.style.color = remoteServerStatus ? "#AAD160" : "gray";

  // dot1.title = sdWebUIStatus
  // ? "Automatic1111 has started"
  // : "Automatic1111 is off";
  // dot2.title = keyRegistrationStatus
  //   ? "User key is registered"
  //   : "User key is not registered";
  // dot3.title = remoteServerStatus
  //   ? "Remote proxy server has started"
  //   : "Remote proxy is off";
}

console.log('👋 This message is being logged by "renderer.js", included via webpack');
