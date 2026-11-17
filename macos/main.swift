// Eigenes App-Fenster fuer das Fitness-Dashboard. Zeigt http://localhost:3210 in einer WebView.
import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var web: WKWebView!
    let home = URL(string: "http://localhost:3210")!

    func applicationDidFinishLaunching(_ notification: Notification) {
        web = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
        web.navigationDelegate = self
        web.uiDelegate = self

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1240, height: 860),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered, defer: false)
        window.title = "Fitness-Dashboard"
        window.minSize = NSSize(width: 720, height: 520)
        window.center()
        window.setFrameAutosaveName("FitnessDashboardMain")
        window.contentView = web
        window.makeKeyAndOrderFront(nil)

        buildMenu()
        NSApp.activate(ignoringOtherApps: true)
        web.load(URLRequest(url: home))
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    // Den Server beenden, den das Startskript fuer dieses Fenster gestartet hat.
    func applicationWillTerminate(_ notification: Notification) {
        if let p = ProcessInfo.processInfo.environment["FD_SERVER_PID"], let pid = Int32(p), pid > 1 {
            kill(pid, SIGTERM)
        }
    }

    // Der Server braucht nach dem Start manchmal einen Moment: einfach erneut laden.
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            guard let self = self else { return }
            self.web.load(URLRequest(url: self.home))
        }
    }

    // Links, die ein neues Fenster wollen, im Standardbrowser oeffnen.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { NSWorkspace.shared.open(url) }
        return nil
    }

    @objc func reload(_ sender: Any?) { web.reload() }
    @objc func goHome(_ sender: Any?) { web.load(URLRequest(url: home)) }

    func buildMenu() {
        let main = NSMenu()

        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Fitness-Dashboard ausblenden", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Fitness-Dashboard beenden", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        main.addItem(appItem)

        let editItem = NSMenuItem()
        let edit = NSMenu(title: "Bearbeiten")
        edit.addItem(withTitle: "Widerrufen", action: Selector(("undo:")), keyEquivalent: "z")
        edit.addItem(NSMenuItem.separator())
        edit.addItem(withTitle: "Ausschneiden", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Kopieren", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Einsetzen", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Alles auswählen", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit
        main.addItem(editItem)

        let viewItem = NSMenuItem()
        let view = NSMenu(title: "Darstellung")
        let r = NSMenuItem(title: "Neu laden", action: #selector(reload(_:)), keyEquivalent: "r")
        r.target = self
        view.addItem(r)
        let h = NSMenuItem(title: "Zur Übersicht", action: #selector(goHome(_:)), keyEquivalent: "1")
        h.target = self
        view.addItem(h)
        viewItem.submenu = view
        main.addItem(viewItem)

        let winItem = NSMenuItem()
        let win = NSMenu(title: "Fenster")
        win.addItem(withTitle: "Im Dock ablegen", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: "Schließen", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        winItem.submenu = win
        main.addItem(winItem)

        NSApp.mainMenu = main
        NSApp.windowsMenu = win
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
