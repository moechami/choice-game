// The renderer.js file is a js file that you can include in your HTML.

//main menu audio function
window.onload = function() {
  const audio = document.getElementById('menu-sound');
  audio.play();
};

// Main menu button functions
const loadGameButton = document.getElementById("load-game-button")
const newGameButton = document.getElementById("new-game-button")
const settingsButton = document.getElementById("settings-button")
const exitButton = document.getElementById("exit-game-button")

loadGameButton.addEventListener("click", loadGame);
newGameButton.addEventListener("click", newGame);
settingsButton.addEventListener("click", openSettings);
exitButton.addEventListener("click", quitApp);
