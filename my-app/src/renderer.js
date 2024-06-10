const { ipcRenderer, remote } = require('electron');

// The renderer.js file is a js file that you can include in your HTML.

// Main menu audio function
window.onload = function() {
  const audio = document.getElementById('menu-sound');
  if (audio) {
    audio.play();
  }

  // Set initial volume based on the slider value
  const soundSlider = document.getElementById('sound-slider');
  if (soundSlider) {
    audio.volume = soundSlider.value / 100; // Volume range is 0.0 to 1.0

    soundSlider.addEventListener('input', () => {
      audio.volume = soundSlider.value / 100;
    });
  }
};

// Main menu button functions
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
      ipcRenderer.send('exit-app');
    });
  }

  const displayModeSelect = document.getElementById("display-mode");
  if (displayModeSelect) {
    displayModeSelect.addEventListener("change", (event) => {
      const mode = event.target.value;
      ipcRenderer.send('change-display-mode', mode);
    });
  }
});

// Function for changing the display modes in the settings page
function changeDisplayMode(mode) {
  const currentWindow = remote.getCurrentWindow();

  switch (mode) {
    case 'fullscreen':
      currentWindow.setFullScreen(true);
      break;
    case 'windowed':
      currentWindow.setFullScreen(false);
      currentWindow.setResizable(true);
      currentWindow.setSize(800, 600); // Set to desired windowed size
      break;
  }
}

ipcRenderer.on('change-display-mode', (event, mode) => {
  changeDisplayMode(mode);
});
