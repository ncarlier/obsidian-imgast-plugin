# Obsidian ImgCast Plugin

An Obsidian plugin to easily share images via [ImgCast](https://github.com/ncarlier/imgcast) — a lightweight image casting server that allows real-time sharing of images without refreshing the page.

## Features

* **Context Menu Integration**
  Adds a `Send to ImgCast` option when right-clicking images in the File Explorer.

* **Inline Image Support**
  Adds the same `Send to ImgCast` option when right-clicking images embedded within notes.

* **Command Palette**
  Includes a command called `Send to ImgCast` to search and cast a selected image.

## How It Works

When you select `Send to ImgCast`, the plugin uploads the image to your ImgCast server using the configured API. Once uploaded, the image is instantly viewable via the ImgCast web interface.

## Plugin Settings

The plugin requires two configuration values:

* **ImgCast Base URL**
  Example: `http://localhost:8080`

* **ImgCast API Key**
  The API key used to authenticate with your ImgCast server.

You can set these values in the plugin settings panel after enabling the plugin.

## Requirements

* A running [ImgCast](https://github.com/ncarlier/imgcast) server
* A valid API key configured on the server

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-imgcast-plugin/`.

## License

The MIT License (MIT)

See [LICENSE](./LICENSE) to see the full text.
