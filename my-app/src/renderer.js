const { ipcRenderer, remote } = require('electron');

// Function to load saved settings from localStorage
function loadSettings() {
  const savedVolume = localStorage.getItem('volume');
  if (savedVolume !== null) {
    const audio = document.getElementById('menu-sound');
    const soundSlider = document.getElementById('sound-slider');
    audio.volume = savedVolume / 100;
    soundSlider.value = savedVolume;
  }
}

// Function to save settings to localStorage
function saveSettings() {
  const soundSlider = document.getElementById('sound-slider');
  localStorage.setItem('volume', soundSlider.value);
  alert('Settings saved!');
}

// Main menu audio function
window.onload = function() {
  const audio = document.getElementById('menu-sound');
  if (audio) {
    audio.play();
  }

  // Set initial volume based on slider value
  const soundSlider = document.getElementById('sound-slider');
  if (soundSlider) {
    soundSlider.addEventListener('input', () => {
      audio.volume = soundSlider.value / 100;
    });
  }

  // Load saved settings
  loadSettings();
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

  const saveButton = document.getElementById("save-button");
  if (saveButton) {
    saveButton.addEventListener("click", saveSettings);
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
    case 'borderless':
      currentWindow.setFullScreen(false);
      currentWindow.setResizable(false);
      currentWindow.setSize(1920, 1080); // Set to desired borderless size
      currentWindow.setSimpleFullScreen(true);
      break;
  }
}

ipcRenderer.on('change-display-mode', (event, mode) => {
  changeDisplayMode(mode);
});
