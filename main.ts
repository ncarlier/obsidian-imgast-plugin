import * as http from 'http'
import * as https from 'https'
import mime from 'mime'
import { App, FileSystemAdapter, FuzzySuggestModal, Menu, normalizePath, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian'
import { basename, resolve } from 'path'
import { FormData } from "formdata-node"
import { FormDataEncoder } from "form-data-encoder"
import { Readable } from 'stream'

interface ImgCastSettings {
  baseURL: string
  apiKey: string
}

const DEFAULT_SETTINGS: ImgCastSettings = {
  baseURL: 'http://127.0.0.1:8080/upload',
  apiKey: 'secret'
}

export default class ImgCastPlugin extends Plugin {
  settings: ImgCastSettings

  async onload() {
    // Load settings
    await this.loadSettings()
 
    // Add settings tab
    this.addSettingTab(new ImgCastSettingTag(this.app, this))

    // Register DOM event to handle right-click on images
    this.registerDomEvent(document, "contextmenu", (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.localName !== "img") return

      const imgSrc = (target as HTMLImageElement).currentSrc
      const file = this.getTFileFormHref(imgSrc)

      if (!(file instanceof TFile)) return
      const menu = new Menu()
      menu.addItem((item) => {
        item.setTitle("Send to ImgCast")
          .setIcon("open-elsewhere-glyph")
          .onClick(async () => {
            this.sendToImgCast(file)
          })
      })

      menu.showAtPosition({ x: event.pageX, y: event.pageY })
    })

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(this.app.vault.adapter instanceof FileSystemAdapter))
          return
        if (!(file instanceof TFile)) return
        const mimeType = mime.getType(file.extension)
        if (mimeType === null || !/image/.test(mimeType)) return

        menu.addItem((item) => {
          item.setTitle("Send to ImgCast")
            .setIcon("open-elsewhere-glyph")
            .onClick(async () => {
              this.sendToImgCast(file)
            })
        })
      })
    )

    // Register a command to send images to ImgCast
    this.addCommand({
      id: "send-to-imgcast",
      name: "Send image to ImgCast",
      callback: () => {
        const files = this.app.vault
          .getFiles()
          .filter((file) => {
            const mimeType = mime.getType(file.extension)
            return mimeType !== null && /image/.test(mimeType)
          })
        const modal = new Suggester(files, this.app)
        modal.onClose = () => {
          if (modal.file) {
            this.sendToImgCast(modal.file)
          }
        }
        modal.open()
      }
    })
  }

  private getTFileFormHref(href: string): TFile | null {
    const url = new URL(href)
    let filePath = url.pathname.substring(1) // Remove leading slash
    filePath = resolve(decodeURI(filePath)) // Decode URI components
    const adapter = this.app.vault.adapter
    if (adapter instanceof FileSystemAdapter) {
      const basePath = adapter.getBasePath()
      console.debug("Base path:", basePath)
      if (filePath.startsWith(basePath)) {
        filePath = filePath.substring(basePath.length + 1) // Remove base path
      }
    } else {
      new Notice("ImgCast: Unable to resolve image path. Please use FileSystemAdapter.")
      return null;
    }
    filePath = normalizePath(filePath)
    console.debug("Resolved file path:", filePath)
    return this.app.vault.getFileByPath(filePath)
  }

  private async sendToImgCast(file: TFile) {
    if (!this.settings.baseURL) {
      new Notice("ImgCast: Base URL is not set in settings.")
      return
    }
    const baseURL = new URL(this.settings.baseURL)
    const request = baseURL.protocol === 'https:' ? https.request : http.request

    const fileName = basename(decodeURI(file.path))
    const buffer = await this.app.vault.readBinary(file)

    const form = new FormData()
    form.append('image', new Blob([buffer], { type: mime.getType(file.extension) || 'application/octet-stream' }), fileName)
    const encoder = new FormDataEncoder(form)

    const req = request({
      method: 'POST',
      path: baseURL.pathname,
      hostname: baseURL.hostname,
      port: baseURL.port,
      headers: {
        ...encoder.headers,
        'X-API-Key': this.settings.apiKey,
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        new Notice(`ImgCast: Error - ${res.statusCode}`)
        return
      }
      new Notice(`ImgCast: Image sent successfully!`)
    })

    req.on('error', (err) => {
      console.error('ImgCast Request Error:', err)
      new Notice(`ImgCast: Request failed - ${err.message}`)
    })

    // Write the form data to the request body
    Readable.from(encoder.encode()).pipe(req)
  }

  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }
}

class ImgCastSettingTag extends PluginSettingTab {
  plugin: ImgCastPlugin

  constructor(app: App, plugin: ImgCastPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty()

    containerEl.createEl("h2", {
      text: "Settings for ImgCast Plugin"
    })

    new Setting(containerEl)
      .setName('Base URL')
      .setDesc('Set the base URL for the ImgCast server')
      .addText(text => text
        .setPlaceholder('http://localhost:8080/upload')
        .setValue(this.plugin.settings.baseURL)
        .onChange(async (value) => {
          this.plugin.settings.baseURL = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Set the API key for the ImgCast server')
      .addText(text => text
        .setPlaceholder('secret')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }));
  }
}

class Suggester extends FuzzySuggestModal<TFile> {
  file: TFile;
  constructor(public files: TFile[], app: App) {
    super(app);
  }
  getItemText(item: TFile) {
    return item.basename;
  }
  getItems(): TFile[] {
    return this.files;
  }
  onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent) {
    this.file = item;
    this.close();
  }
}
