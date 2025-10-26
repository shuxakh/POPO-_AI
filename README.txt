TEACHER-ONLY AI TUTOR (Chrome) — NO CODING

What it does
------------
- You open one page in Chrome (teacher.html)
- Choose audio source: Microphone OR capture a Chrome tab with audio (e.g., Google Meet tab)
- The page transcribes the student's speech and shows short, private AI hints for the teacher

You need
--------
1) Chrome browser
2) Node.js 18+ (download from https://nodejs.org, LTS version)
3) An OpenAI API key (platform.openai.com → API Keys → Create new secret key)

Steps
-----
1) Unzip this folder.
2) Easiest (no Terminal):
   - On macOS: double-click "Start.command" in this folder. If there's no .env, it will use your machine's OPENAI_API_KEY if set; otherwise it will ask for your key once. It will open the page using your LAN IP so other devices can connect.
   - On Windows: open Command Prompt in this folder and run: run.sh (WSL/Git Bash) or follow step 3.
3) Manual (Terminal):
   - Copy "env.example" to ".env" and put your OpenAI key.
   - Run: npm install
   - Start: npm run start:host
   - Open: http://localhost:10000/teacher.html
5) Click:
   - "Microphone" if your laptop mic can hear the student (speaker on)
   - OR "Capture a Chrome Tab" if the student speaks in a Chrome tab (Meet/Zoom Web). When Chrome asks, choose the tab and tick "Share tab audio".
6) Watch live transcript and AI hints appear. These hints are private (only on this page).
7) To connect from another device on the same Wi‑Fi, use one of the LAN URLs shown by Start.command/run.sh (e.g., http://YOUR_LAN_IP:10000/teacher.html).

Tips
----
- If hints are too frequent or repeated, pause and resume.
- For better accuracy later, replace browser transcription with server Whisper; I can help upgrade when you're ready.
- English by default; you can change recognition language in the code later (en-US).

Stop
----
Close the browser tab or press Stop. To stop the server, press Ctrl+C in the terminal.
