# Lyric Speaker Desktop App

A minimalist 3D kinetic lyric visualization desktop app powered by Electron, Three.js, and the TextAlive App API. It allows your computer to act as a dual audio receiver (AirPlay and Classic Bluetooth A2DP Sink), syncing incoming music with stunning typography animations.

## Features

- **Dual Receiver Mode:** Cast audio from iOS devices via AirPlay or connect Android/PC devices via Classic Bluetooth.
- **Dynamic Kinetic Typography:** The animation engine parses the "vibe" and tempo of the incoming music. Slow songs feature elegant, flowing transitions, while fast-paced songs trigger sharp, energetic typographic layouts.
- **TextAlive Integration:** Pulls synchronized lyric and beat data directly from the TextAlive API in real-time.

## Setup & Installation

1. Clone the repository and install dependencies:
   \`npm i\`
   *(Note: This project relies on native Node modules like \`speaker\`. Ensure you have Python, a C++ compiler, and ALSA headers installed before running.)*

2. Register for a TextAlive developer token at developer.textalive.jp. Open \`index.html\` and paste your token in the TextAlive App API initialization block to remove sandbox restrictions.

3. Start the application using Electron.

## How to Use

1. Launch the app and click the **Connect Device** button. The app will enter "Searching..." mode.
2. **For iOS (AirPlay):** Open your AirPlay menu and look for a new device named after your computer (hosted by \`airplay-server\`). Connect and play your music.
3. **For Android / Windows (Bluetooth):** Pair your phone to your computer's native Bluetooth settings. The app uses system audio loopback to capture the stream. Play your music.
4. Once audio begins playing, the app will automatically synchronize with the TextAlive API and generate the custom 3D lyrics!

## Architecture

- **Renderer (\`index.html\`):** Houses the Three.js scene, font parsing via opentype.js, physics calculations, and the TextAlive player loop.
- **Main (\`main.js\`):** Bootstraps the Electron window and securely initiates the AirPlay server process.
- **Preload (\`preload.js\`):** Maps backend IPC connections to safely pipe server statuses into the UI connection menu.
