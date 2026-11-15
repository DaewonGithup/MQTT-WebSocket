// MQTT 공유 실행기: 이 exe가 있는 폴더에서 서버(node server.js)를 켜고 호스트 화면을 브라우저로 띄운다.
// 이 창이 서버 창이다. 창을 닫거나 "세션 종료"를 누르면 서버가 꺼지고 내용이 모두 지워진다.
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;

class Launcher
{
    static int Run(string dir, string file, string args, bool openBrowser)
    {
        var psi = new ProcessStartInfo(file, args) { WorkingDirectory = dir, UseShellExecute = false };
        if (openBrowser) psi.EnvironmentVariables["OPEN_BROWSER"] = "1";
        using (Process p = Process.Start(psi)) { p.WaitForExit(); return p.ExitCode; }   // 같은 창을 써서 PIN·주소가 이 창에 보인다
    }

    static int Fail(string msg)
    {
        Console.WriteLine();
        Console.WriteLine(msg);
        Console.WriteLine("아무 키나 누르면 창이 닫힙니다.");
        Console.ReadKey(true);
        return 1;
    }

    static int Main()
    {
        Console.Title = "로컬 MQTT 공유 - 이 창을 닫으면 세션이 끝납니다";
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        if (!File.Exists(Path.Combine(dir, "server.js"))) return Fail("server.js를 찾지 못했어요. exe를 프로젝트 폴더 안에 두고 실행하세요.");
        try
        {
            if (!Directory.Exists(Path.Combine(dir, "node_modules")))
            {
                Console.WriteLine("처음 실행이라 필요한 부품을 설치합니다 (npm install)...");
                if (Run(dir, "cmd.exe", "/c npm install", false) != 0) return Fail("부품 설치에 실패했어요. 인터넷 연결을 확인하세요.");
            }
            if (Run(dir, "node", "server.js", true) != 0) return Fail("서버가 오류로 꺼졌어요. 위의 메시지를 확인하세요 (8080 포트를 이미 쓰고 있을 수 있어요).");
            return 0;
        }
        catch (Win32Exception)
        {
            return Fail("Node.js가 설치되어 있지 않아요. https://nodejs.org 에서 설치한 뒤 다시 실행하세요.");
        }
    }
}
