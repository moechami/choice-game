// The renderer.js file is a js file that you can include in your HTML.

//main menu audio function
window.onload = function() {
  const audio = document.getElementById('menu-sound');
  if (audio) {
    audio.play();
  }
};

//Main menu button functions
document.addEventListener("DOMContentLoaded", () => {
  const settingsButton = document.getElementById("settings-button");
  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      window.location.href = "settings.html";
    });
  }

  const backButton = document.getElementById("back-button");
  if (backButton) {
    backButton.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  const exitButton = document.getElementById("exit-button");
  if (exitButton) {
    exitButton.addEventListener("click", () => {
      window.electron.exitApp();
    });
  }

});
