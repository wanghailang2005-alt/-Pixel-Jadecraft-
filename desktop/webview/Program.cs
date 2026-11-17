using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal sealed class GameWindow : Form
{
    private readonly WebView2 browser = new WebView2();
    private readonly Label status = new Label();
    private Rectangle windowBounds;
    private FormWindowState previousWindowState;
    private bool fullScreen;

    public GameWindow()
    {
        Text = "像素琢玉 · Pixel Jadecraft";
        ClientSize = new Size(1440, 900);
        MinimumSize = new Size(960, 680);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(23, 43, 43);
        browser.Dock = DockStyle.Fill;
        browser.DefaultBackgroundColor = BackColor;
        status.Dock = DockStyle.Fill;
        status.ForeColor = Color.White;
        status.TextAlign = ContentAlignment.MiddleCenter;
        status.Text = "正在打开像素琢玉……";
        Controls.Add(browser);
        Controls.Add(status);
        Shown += async delegate { await InitializeBrowser(); };
    }

    private async Task InitializeBrowser()
    {
        try
        {
            bool runtimeMissing = false;
            try
            {
                CoreWebView2Environment.GetAvailableBrowserVersionString();
            }
            catch (WebView2RuntimeNotFoundException)
            {
                runtimeMissing = true;
            }
            if (runtimeMissing)
            {
                status.Text = "首次运行需要安装 Microsoft WebView2，请保持联网……";
                string bootstrapper = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "MicrosoftEdgeWebview2Setup.exe");
                using (Process installer = Process.Start(new ProcessStartInfo(bootstrapper, "/silent /install")
                {
                    UseShellExecute = false,
                    CreateNoWindow = true
                }))
                {
                    await Task.Run(delegate { installer.WaitForExit(); });
                }
                CoreWebView2Environment.GetAvailableBrowserVersionString();
            }

            string profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Pixel Jadecraft", "WebView2");
            CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, profile);
            await browser.EnsureCoreWebView2Async(environment);
            browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            browser.CoreWebView2.SetVirtualHostNameToFolderMapping("jadecraft.local", Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "dist"), CoreWebView2HostResourceAccessKind.DenyCors);
            browser.CoreWebView2.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs e)
            {
                e.Handled = true;
                OpenExternal(e.Uri);
            };
            browser.CoreWebView2.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs e)
            {
                Uri uri;
                if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out uri) || uri.Scheme != "https" || uri.Host != "jadecraft.local")
                {
                    e.Cancel = true;
                    OpenExternal(e.Uri);
                }
            };
            browser.CoreWebView2.WindowCloseRequested += delegate { Close(); };
            browser.KeyDown += delegate(object sender, KeyEventArgs e)
            {
                if (e.KeyCode == Keys.F11)
                {
                    e.Handled = true;
                    e.SuppressKeyPress = true;
                    BeginInvoke((Action)ToggleFullScreen);
                }
            };
            browser.CoreWebView2.NavigationCompleted += delegate(object sender, CoreWebView2NavigationCompletedEventArgs e)
            {
                status.Visible = !e.IsSuccess;
                if (!e.IsSuccess) status.Text = "游戏加载失败，请重新安装。\n" + e.WebErrorStatus;
            };
            browser.CoreWebView2.Navigate("https://jadecraft.local/index.html");
        }
        catch (Exception error)
        {
            status.Text = "启动失败。请检查 Microsoft WebView2 是否安装完成后重试。\n\n" + error.Message;
        }
    }

    private static void OpenExternal(string address)
    {
        Uri uri;
        if (Uri.TryCreate(address, UriKind.Absolute, out uri) && uri.Scheme == "https")
        {
            try { Process.Start(new ProcessStartInfo(address) { UseShellExecute = true }); }
            catch (Exception error) { MessageBox.Show(error.Message, "无法打开链接"); }
        }
    }

    private void ToggleFullScreen()
    {
        if (!fullScreen)
        {
            windowBounds = Bounds;
            previousWindowState = WindowState;
            WindowState = FormWindowState.Normal;
            FormBorderStyle = FormBorderStyle.None;
            Bounds = Screen.FromControl(this).Bounds;
        }
        else
        {
            FormBorderStyle = FormBorderStyle.Sizable;
            Bounds = windowBounds;
            WindowState = previousWindowState;
        }
        fullScreen = !fullScreen;
    }

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new GameWindow());
    }
}
