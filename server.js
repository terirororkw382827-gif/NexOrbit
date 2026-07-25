const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const WebSocket = require('ws');

const app = express();
const CLIENT_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<title>ORBIT // CRASH</title>
<style>
  :root{
    --bg:#050714; --bg2:#0a0f26; --panel:#0d1330; --panel-line:#1c254f;
    --text:#e8ecff; --dim:#8188ab;
    --red:#ff4d5e; --amber:#ffb545; --cyan:#33f4e0; --purple:#c48bff; --green:#33ff88;
  }
  *{box-sizing:border-box; -webkit-tap-highlight-color:transparent;}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--text);
    font-family:'Segoe UI',Roboto,Arial,sans-serif;height:100%;overflow:hidden;user-select:none;}
  .app{max-width:520px;margin:0 auto;width:100%;
    height:100vh;height:100dvh;height:calc(var(--vh,1vh) * 100);
    display:flex;flex-direction:column;position:relative;
    overflow-y:auto;overflow-x:hidden;
    padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);}

  /* ---------- AUTH MODAL ---------- */
  .modal-overlay{position:fixed;inset:0;background:rgba(3,5,15,.92);z-index:100;
    display:flex;align-items:center;justify-content:center;padding:16px;}
  .modal-box{width:100%;max-width:380px;background:var(--panel);border:1px solid var(--panel-line);
    border-radius:16px;padding:22px;}
  .modal-title{font-family:'Consolas',monospace;font-size:20px;letter-spacing:2px;text-align:center;margin-bottom:4px;}
  .modal-title b{color:var(--cyan);}
  .modal-tabs{display:flex;gap:8px;margin:16px 0 14px;}
  .modal-tab{flex:1;text-align:center;padding:9px;border-radius:8px;font-size:13px;cursor:pointer;
    background:var(--bg2);border:1px solid var(--panel-line);color:var(--dim);font-family:'Consolas',monospace;}
  .modal-tab.active{color:var(--cyan);border-color:var(--cyan);}
  .modal-field{margin-bottom:10px;}
  .modal-field input{width:100%;background:var(--bg2);border:1px solid var(--panel-line);color:var(--text);
    padding:11px 12px;border-radius:9px;font-size:15px;outline:none;font-family:'Consolas',monospace;}
  .modal-error{color:var(--red);font-size:12px;min-height:16px;margin:6px 0 8px;font-family:'Consolas',monospace;}
  .modal-submit{width:100%;padding:13px;border:none;border-radius:10px;font-weight:700;letter-spacing:1px;
    background:linear-gradient(90deg,var(--cyan),#1fd8c4);color:#03231f;cursor:pointer;font-size:15px;}

  /* ---------- TOP BAR ---------- */
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 6px;z-index:5;flex:0 0 auto;}
  .brand{font-family:'Consolas',monospace;letter-spacing:2px;font-size:clamp(10px,3vw,13px);color:var(--dim);white-space:nowrap;}
  .brand b{color:var(--cyan);}
  .user-balance{display:flex;align-items:center;gap:8px;font-family:'Consolas',monospace;font-size:clamp(12px,3.4vw,15px);}
  .balance-box{background:var(--panel);border:1px solid var(--panel-line);padding:6px 10px;border-radius:8px;}
  .balance-box span{color:var(--amber);font-weight:bold;}
  .username-tag{color:var(--dim);font-size:11px;}

  /* ---------- TABS ---------- */
  .tabbar{display:flex;gap:6px;padding:0 14px 8px;flex:0 0 auto;}
  .tab-btn{flex:1;text-align:center;padding:9px 4px;border-radius:9px;font-size:clamp(11px,3vw,13px);
    background:var(--panel);border:1px solid var(--panel-line);color:var(--dim);font-family:'Consolas',monospace;cursor:pointer;}
  .tab-btn.active{color:var(--bg);background:linear-gradient(90deg,var(--cyan),#1fd8c4);border-color:transparent;}

  .view{display:none;flex:1;min-height:0;flex-direction:column;}
  .view.active{display:flex;}

  /* ---------- STAGE ---------- */
  .stage{position:relative;flex:1;min-height:120px;margin:0 12px;border-radius:14px;overflow:hidden;
    background:radial-gradient(ellipse at 50% 100%,#10184a 0%,transparent 60%),linear-gradient(180deg,var(--bg2) 0%,#050714 100%);
    border:1px solid var(--panel-line);}
  .grid-lines{position:absolute;inset:0;
    background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 40px),
      repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 40px);
    mask-image:radial-gradient(ellipse at 50% 80%,black 30%,transparent 75%);}
  .star{position:absolute;background:#fff;border-radius:50%;opacity:.5;animation:twinkle 2.6s ease-in-out infinite;}
  @keyframes twinkle{0%,100%{opacity:.15;}50%{opacity:.9;}}

  .mult-display{position:absolute;top:16%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:4;width:90%;}
  .mult-num{font-family:'Consolas',monospace;font-weight:700;font-size:clamp(30px,10vw,54px);letter-spacing:1px;
    color:var(--cyan);transition:color .25s;}
  .mult-num.low{color:var(--red);text-shadow:0 0 22px rgba(255,77,94,.5);}
  .mult-num.mid{color:var(--amber);text-shadow:0 0 22px rgba(255,181,69,.45);}
  .mult-num.high{color:var(--cyan);text-shadow:0 0 22px rgba(51,244,224,.45);}
  .mult-num.super{color:var(--purple);text-shadow:0 0 24px rgba(196,139,255,.5);}
  .mult-num.white{color:#ffffff;text-shadow:0 0 26px rgba(255,255,255,.7);}
  .mult-num.rainbow{background:linear-gradient(90deg,#ff4d4d,#ffb545,#f4ff5e,#33ff88,#33d4ff,#a366ff,#ff4d4d);
    background-size:400% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
    animation:rainbowShift 2.6s linear infinite;}
  @keyframes rainbowShift{0%{background-position:0% 50%;}100%{background-position:400% 50%;}}
  .mult-num.crashed{color:var(--red)!important;background:none!important;-webkit-text-fill-color:var(--red);
    text-shadow:0 0 28px rgba(255,77,94,.6);}
  .mult-sub{margin-top:2px;font-size:clamp(10px,2.6vw,13px);color:var(--dim);letter-spacing:2px;font-family:'Consolas',monospace;}

  .countdown-wrap{position:absolute;top:16%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:4;width:80%;max-width:220px;}
  .countdown-label{font-size:clamp(9px,2.6vw,12px);letter-spacing:2px;color:var(--dim);margin-bottom:8px;font-family:'Consolas',monospace;}
  .countdown-bar-bg{height:6px;border-radius:4px;background:var(--panel-line);overflow:hidden;}
  .countdown-bar{height:100%;background:linear-gradient(90deg,var(--cyan),var(--amber));width:100%;transition:width .1s linear;}
  .countdown-time{margin-top:6px;font-family:'Consolas',monospace;font-size:clamp(16px,5vw,22px);}

  .rocket-wrap{position:absolute;left:50%;bottom:8%;transform:translate(-50%,0);z-index:3;
    width:clamp(34px,11vw,50px);}
  .rocket-wrap.flying{animation:wobble 1.1s ease-in-out infinite;}
  @keyframes wobble{0%,100%{margin-left:-5px;}50%{margin-left:5px;}}
  .rocket-svg{width:100%;height:auto;filter:drop-shadow(0 0 8px rgba(51,244,224,.35));}
  .flame{transform-origin:30px 95px;animation:flameFlicker .18s ease-in-out infinite alternate;}
  @keyframes flameFlicker{0%{transform:scaleY(.85) scaleX(.9);}100%{transform:scaleY(1.15) scaleX(1.05);}}
  .trail{position:absolute;left:50%;bottom:0;width:3px;background:linear-gradient(180deg,rgba(255,181,69,.6),rgba(255,181,69,0));
    transform:translate(-50%,0);border-radius:2px;z-index:2;}
  .boom{position:absolute;left:50%;font-size:clamp(38px,12vw,60px);transform:translate(-50%,-50%) scale(.4);opacity:0;z-index:5;}
  .boom.show{animation:boomPop .6s ease-out forwards;}
  @keyframes boomPop{0%{transform:translate(-50%,-50%) scale(.3);opacity:0;}30%{transform:translate(-50%,-50%) scale(1.3);opacity:1;}
    100%{transform:translate(-50%,-50%) scale(1.6);opacity:0;}}
  .shake{animation:screenShake .4s;}
  @keyframes screenShake{0%,100%{transform:translate(0,0);}20%{transform:translate(-4px,3px);}40%{transform:translate(4px,-3px);}
    60%{transform:translate(-3px,-2px);}80%{transform:translate(3px,2px);}}

  .floater{position:absolute;left:50%;bottom:20%;transform:translate(-50%,0);font-family:'Consolas',monospace;font-weight:bold;
    font-size:clamp(12px,3.6vw,15px);padding:6px 14px;border-radius:20px;z-index:6;opacity:0;white-space:nowrap;}
  .floater.win{background:rgba(51,244,224,.12);color:var(--cyan);border:1px solid rgba(51,244,224,.4);}
  .floater.lose{background:rgba(255,77,94,.12);color:var(--red);border:1px solid rgba(255,77,94,.4);}
  .floater.show{animation:floatUp 1.8s ease-out forwards;}
  @keyframes floatUp{0%{opacity:0;transform:translate(-50%,10px);}15%{opacity:1;transform:translate(-50%,0);}
    80%{opacity:1;}100%{opacity:0;transform:translate(-50%,-30px);}}

  /* ---------- CONTROLS ---------- */
  .controls{padding:10px 14px;flex:0 0 auto;position:sticky;bottom:0;background:var(--bg);z-index:20;}
  .bet-row{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;}
  .bet-input{flex:1 1 90px;min-width:0;background:var(--panel);border:1px solid var(--panel-line);color:var(--text);
    font-family:'Consolas',monospace;font-size:clamp(13px,3.8vw,16px);padding:9px 10px;border-radius:9px;outline:none;}
  .chip{background:var(--panel);border:1px solid var(--panel-line);color:var(--dim);font-family:'Consolas',monospace;
    padding:9px 9px;border-radius:9px;font-size:clamp(10px,2.8vw,12px);cursor:pointer;flex:0 0 auto;}
  .chip.max-chip{color:var(--amber);border-color:rgba(255,181,69,.4);}
  .chip:active{background:var(--panel-line);}

  .main-btn{width:100%;padding:14px;border:none;border-radius:11px;font-size:clamp(13px,4vw,16px);font-weight:700;
    letter-spacing:1px;cursor:pointer;font-family:'Consolas',monospace;transition:transform .08s;}
  .main-btn:active{transform:scale(.98);}
  .main-btn.place{background:linear-gradient(90deg,var(--cyan),#1fd8c4);color:#03231f;}
  .main-btn.cashout{background:linear-gradient(90deg,var(--amber),#ff8a3d);color:#2b1500;}
  .main-btn.waitnext,.main-btn.locked{background:var(--panel);color:var(--dim);border:1px solid var(--panel-line);cursor:default;}
  .main-btn:disabled{opacity:.55;cursor:default;}
  .status-line{text-align:center;font-size:clamp(10px,2.8vw,12px);color:var(--dim);margin-top:7px;
    font-family:'Consolas',monospace;min-height:15px;}

  /* ---------- HISTORY + PLAYERS ---------- */
  .history{display:flex;gap:6px;padding:0 14px 8px;overflow-x:auto;flex:0 0 auto;}
  .history::-webkit-scrollbar{display:none;}
  .hchip{flex:0 0 auto;padding:5px 9px;border-radius:8px;font-family:'Consolas',monospace;font-size:clamp(11px,3vw,13px);
    font-weight:700;background:var(--panel);border:1px solid var(--panel-line);animation:chipIn .3s ease-out;}
  @keyframes chipIn{0%{transform:scale(.6);opacity:0;}100%{transform:scale(1);opacity:1;}}
  .hchip.low{color:var(--red);} .hchip.mid{color:var(--amber);} .hchip.high{color:var(--cyan);}
  .hchip.super{color:var(--purple);} .hchip.white{color:#fff;}
  .hchip.rainbow{background:linear-gradient(90deg,#ff4d4d,#ffb545,#f4ff5e,#33ff88,#33d4ff,#a366ff);
    -webkit-background-clip:text;background-clip:text;color:transparent;}

  .players-panel{flex:0 0 auto;max-height:26vh;overflow-y:auto;padding:0 14px 12px;}
  .players-title{font-size:11px;color:var(--dim);letter-spacing:2px;font-family:'Consolas',monospace;margin-bottom:6px;}
  .player-row{display:flex;align-items:center;justify-content:space-between;gap:8px;
    background:var(--panel);border:1px solid var(--panel-line);border-radius:9px;padding:7px 10px;margin-bottom:5px;
    font-family:'Consolas',monospace;font-size:clamp(11px,3vw,13px);}
  .player-name{color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:38%;}
  .player-amount{color:var(--dim);}
  .player-mult{font-weight:700;}
  .player-mult.cashed{color:var(--green);}
  .player-mult.busted{color:var(--red);}
  .empty-note{color:var(--dim);font-size:12px;text-align:center;padding:6px;font-family:'Consolas',monospace;}

  /* ---------- FREE CRASH TAB ---------- */
  .free-info{padding:10px 14px 0;font-family:'Consolas',monospace;font-size:12px;color:var(--dim);text-align:center;flex:0 0 auto;}
  .free-info b{color:var(--amber);}

  @media (max-width:360px){
    .bet-row{gap:5px;}
    .chip{padding:8px 7px;}
  }

  @media (max-height:700px){
    .stage{min-height:90px;}
    .players-panel{max-height:18vh;}
    .controls{padding:6px 14px;}
    .topbar{padding:6px 14px 4px;}
    .tabbar{padding:0 14px 6px;}
  }
  @media (max-height:600px){
    .stage{min-height:70px;}
    .players-panel{max-height:14vh;}
    .autoco-row{display:none!important;}
  }
</style>
</head>
<body>
<div class="app" id="app">

  <!-- AUTH MODAL -->
  <div class="modal-overlay" id="authModal">
    <div class="modal-box">
      <div class="modal-title">ORBIT // <b>CRASH</b></div>
      <div class="modal-tabs">
        <div class="modal-tab active" id="tabLogin" onclick="switchAuthTab('login')">Вход</div>
        <div class="modal-tab" id="tabRegister" onclick="switchAuthTab('register')">Регистрация</div>
      </div>

      <div id="loginForm">
        <div class="modal-field"><input type="text" id="loginUsername" placeholder="Ник" autocomplete="username"></div>
        <div class="modal-field"><input type="password" id="loginPassword" placeholder="Пароль" autocomplete="current-password"></div>
        <div class="modal-error" id="loginError"></div>
        <button class="modal-submit" onclick="doLogin()">Войти</button>
      </div>

      <div id="registerForm" style="display:none;">
        <div class="modal-field"><input type="text" id="regUsername" placeholder="Ник (3-16 символов)" autocomplete="username"></div>
        <div class="modal-field"><input type="password" id="regPassword" placeholder="Пароль (мин. 4 симв.)" autocomplete="new-password"></div>
        <div class="modal-field"><input type="password" id="regPassword2" placeholder="Повтори пароль" autocomplete="new-password"></div>
        <div class="modal-error" id="regError"></div>
        <button class="modal-submit" onclick="doRegister()">Создать аккаунт</button>
      </div>
    </div>
  </div>

  <div class="topbar">
    <div class="brand">ORBIT // <b>CRASH</b></div>
    <div class="user-balance">
      <span class="username-tag" id="userTag"></span>
      <div class="balance-box">💰 <span id="balance">0.00</span></div>
    </div>
  </div>

  <div class="tabbar">
    <div class="tab-btn active" id="tabMainBtn" onclick="switchView('main')">Обычный краш</div>
    <div class="tab-btn" id="tabFreeBtn" onclick="switchView('free')">Бесплатный краш (1/день)</div>
  </div>

  <!-- ============ MAIN VIEW ============ -->
  <div class="view active" id="viewMain">
    <div class="stage" id="stage">
      <div class="grid-lines"></div>
      <div class="star" id="starsHolder"></div>

      <div class="countdown-wrap" id="countdownWrap">
        <div class="countdown-label">СЛЕДУЮЩИЙ ЗАПУСК ЧЕРЕЗ</div>
        <div class="countdown-bar-bg"><div class="countdown-bar" id="countdownBar"></div></div>
        <div class="countdown-time" id="countdownTime">10.0s</div>
      </div>

      <div class="mult-display" id="multDisplay" style="display:none;">
        <div class="mult-num" id="multNum">1.00x</div>
        <div class="mult-sub" id="multSub">ПОЛЁТ ИДЁТ</div>
      </div>

      <div class="trail" id="trail" style="height:0;"></div>
      <div class="rocket-wrap" id="rocketLayer" style="display:none;">
        <svg class="rocket-svg" viewBox="0 0 60 140">
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f2f5ff"/><stop offset="100%" stop-color="#a9b4e8"/>
            </linearGradient>
            <radialGradient id="flameGrad" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stop-color="#fff6c8"/><stop offset="45%" stop-color="#ffb545"/><stop offset="100%" stop-color="rgba(255,107,53,0)"/>
            </radialGradient>
          </defs>
          <ellipse class="flame" cx="30" cy="112" rx="9" ry="26" fill="url(#flameGrad)"/>
          <path d="M12 100 L-2 122 L12 114 Z" fill="#ff6b35"/>
          <path d="M48 100 L62 122 L48 114 Z" fill="#ff6b35"/>
          <path d="M30 2 C44 26 47 68 47 96 L13 96 C13 68 16 26 30 2 Z" fill="url(#bodyGrad)" stroke="#1c254f" stroke-width="2"/>
          <circle cx="30" cy="46" r="9" fill="#33f4e0" stroke="#0d1330" stroke-width="2.5"/>
        </svg>
      </div>
      <div class="boom" id="boom">💥</div>
      <div class="floater" id="floater"></div>
    </div>

    <div class="controls">
      <div class="bet-row">
        <input type="text" inputmode="numeric" class="bet-input" id="betInput" value="100">
        <div class="chip" onclick="setBet(50)">+50</div>
        <div class="chip" onclick="setBet(100)">+100</div>
        <div class="chip max-chip" onclick="setBetMax()">MAX</div>
        <div class="chip" onclick="halveBet()">½</div>
      </div>
      <div class="autoco-row" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;color:var(--dim);font-family:'Consolas',monospace;">
        <input type="checkbox" id="autoEnabled" style="accent-color:var(--cyan);">
        <label for="autoEnabled">Авто-кэшаут при</label>
        <input type="text" inputmode="decimal" id="autoValue" value="2.00" style="width:60px;background:var(--panel);border:1px solid var(--panel-line);color:var(--text);padding:5px 7px;border-radius:7px;outline:none;font-family:'Consolas',monospace;font-size:12px;">
        <span>x</span>
      </div>
      <button class="main-btn place" id="mainBtn" onclick="onMainBtn()">СДЕЛАТЬ СТАВКУ</button>
      <div class="status-line" id="statusLine">Подключение...</div>
    </div>

    <div class="history" id="history"></div>
    <div class="players-panel" id="playersPanel">
      <div class="players-title">ИГРОКИ В РАУНДЕ</div>
      <div id="playersList"><div class="empty-note">Пока никто не поставил</div></div>
    </div>
  </div>

  <!-- ============ FREE CRASH VIEW ============ -->
  <div class="view" id="viewFree">
    <div class="free-info" id="freeInfo">Ставка фиксирована: <b>100</b>. Один запуск в сутки, сброс в 00:00 по МСК.</div>
    <div class="stage" id="stageFree">
      <div class="grid-lines"></div>
      <div class="mult-display" id="freeMultDisplay">
        <div class="mult-num" id="freeMultNum">1.00x</div>
        <div class="mult-sub" id="freeMultSub">ГОТОВ К ЗАПУСКУ</div>
      </div>
      <div class="trail" id="freeTrail" style="height:0;"></div>
      <div class="rocket-wrap" id="freeRocketLayer" style="display:none;">
        <svg class="rocket-svg" viewBox="0 0 60 140">
          <ellipse class="flame" cx="30" cy="112" rx="9" ry="26" fill="url(#flameGrad)"/>
          <path d="M12 100 L-2 122 L12 114 Z" fill="#ff6b35"/>
          <path d="M48 100 L62 122 L48 114 Z" fill="#ff6b35"/>
          <path d="M30 2 C44 26 47 68 47 96 L13 96 C13 68 16 26 30 2 Z" fill="url(#bodyGrad)" stroke="#1c254f" stroke-width="2"/>
          <circle cx="30" cy="46" r="9" fill="#33f4e0" stroke="#0d1330" stroke-width="2.5"/>
        </svg>
      </div>
      <div class="boom" id="freeBoom">💥</div>
      <div class="floater" id="freeFloater"></div>
    </div>
    <div class="controls">
      <button class="main-btn place" id="freeBtn" onclick="onFreeBtn()">ИГРАТЬ (бесплатно)</button>
      <div class="status-line" id="freeStatusLine">Проверка доступности...</div>
    </div>
  </div>

</div>

<script>
// =====================================================================
// VIEWPORT HEIGHT FIX
// 100vh/100dvh is unreliable on a lot of real devices (older Android
// WebViews, in-app browsers, some iOS Safari versions with the address
// bar) — it can be measured too tall or too short, which is what breaks
// the layout/scaling on some screens. We compute the real visible height
// in JS and expose it as --vh, recalculated on resize/orientation change.
// =====================================================================
function setVh(){
  const h = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
  document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
}
setVh();
window.addEventListener('resize', setVh);
window.addEventListener('orientationchange', setVh);
if(window.visualViewport){ window.visualViewport.addEventListener('resize', setVh); }

// =====================================================================
// AUTH
// =====================================================================
let token = localStorage.getItem('crash_token');
let myUsername = localStorage.getItem('crash_username') || '';
let balance = 0;
let ws = null;

function switchAuthTab(which){
  document.getElementById('tabLogin').classList.toggle('active', which==='login');
  document.getElementById('tabRegister').classList.toggle('active', which==='register');
  document.getElementById('loginForm').style.display = which==='login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = which==='register' ? 'block' : 'none';
}

async function doLogin(){
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try{
    const res = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, password})});
    const data = await res.json();
    if(!res.ok){ errEl.textContent = data.error || 'Ошибка входа'; return; }
    token = data.token; myUsername = data.username; balance = data.balance;
    localStorage.setItem('crash_token', token);
    localStorage.setItem('crash_username', myUsername);
    hideAuthModal();
    connectWS();
  }catch(e){ errEl.textContent = 'Не удалось связаться с сервером'; }
}

async function doRegister(){
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const password2 = document.getElementById('regPassword2').value;
  const errEl = document.getElementById('regError');
  errEl.textContent = '';
  if(password !== password2){ errEl.textContent = 'Пароли не совпадают'; return; }
  try{
    const res = await fetch('/api/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, password, confirmPassword: password2})});
    const data = await res.json();
    if(!res.ok){ errEl.textContent = data.error || 'Ошибка регистрации'; return; }
    token = data.token; myUsername = data.username; balance = data.balance;
    localStorage.setItem('crash_token', token);
    localStorage.setItem('crash_username', myUsername);
    hideAuthModal();
    connectWS();
  }catch(e){ errEl.textContent = 'Не удалось связаться с сервером'; }
}

function hideAuthModal(){ document.getElementById('authModal').style.display = 'none'; }
function showAuthModal(){ document.getElementById('authModal').style.display = 'flex'; }

let authTimeoutId = null;
function connectWS(){
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + location.host);
  ws.onopen = () => {
    ws.send(JSON.stringify({type:'auth', token}));
    clearTimeout(authTimeoutId);
    authTimeoutId = setTimeout(()=>{
      // no 'authed'/'auth_error' came back at all — most likely the
      // WebSocket connection isn't actually reaching the server (some
      // hosts/proxies don't forward the ws Upgrade correctly)
      statusLine.textContent = 'Нет ответа от сервера по WebSocket — проверь, что хостинг поддерживает WebSocket-соединения';
      freeStatusLine.textContent = 'Нет ответа от сервера по WebSocket';
    }, 6000);
  };
  ws.onmessage = (ev) => { clearTimeout(authTimeoutId); handleServerMessage(JSON.parse(ev.data)); };
  ws.onerror = () => { statusLine.textContent = 'Ошибка WebSocket-соединения'; };
  ws.onclose = () => {
    clearTimeout(authTimeoutId);
    setTimeout(()=>{ if(token) connectWS(); }, 1500);
  };
}

if(token){ hideAuthModal(); connectWS(); } else { showAuthModal(); }

// =====================================================================
// SHARED HELPERS
// =====================================================================
function fmt(n){ return Number(n).toFixed(2); }
function updateBalanceDisplay(){
  document.getElementById('balance').textContent = fmt(balance);
  document.getElementById('userTag').textContent = myUsername;
}

function multClass(v){
  if(v >= 100000) return 'rainbow';
  if(v >= 1000) return 'white';
  if(v >= 10) return 'super';
  if(v >= 3) return 'high';
  if(v >= 1.5) return 'mid';
  return 'low';
}

function showFloaterEl(el, text, cls){
  el.textContent = text;
  el.className = 'floater ' + cls;
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(()=>{ el.classList.remove('show'); }, 1800);
}

function buildStarsInto(stage){
  let s = '';
  for(let i=0;i<35;i++){
    const top = Math.random()*100, left = Math.random()*100;
    const delay = (Math.random()*2.6).toFixed(2);
    const size = Math.random()<0.15 ? 3 : 2;
    s += \`<div class="star" style="top:\${top}%;left:\${left}%;animation-delay:\${delay}s;width:\${size}px;height:\${size}px;"></div>\`;
  }
  stage.insertAdjacentHTML('afterbegin', s);
}
buildStarsInto(document.getElementById('stage'));
buildStarsInto(document.getElementById('stageFree'));
document.getElementById('starsHolder').remove();

function switchView(which){
  document.getElementById('viewMain').classList.toggle('active', which==='main');
  document.getElementById('viewFree').classList.toggle('active', which==='free');
  document.getElementById('tabMainBtn').classList.toggle('active', which==='main');
  document.getElementById('tabFreeBtn').classList.toggle('active', which==='free');
}

// =====================================================================
// MAIN ROUND STATE
// =====================================================================
let phase = 'waiting';
let myBetPlaced = false;
let myCashedOut = false;
let currentMultiplier = 1;

const betInput = document.getElementById('betInput');
const mainBtn = document.getElementById('mainBtn');
const statusLine = document.getElementById('statusLine');
const countdownWrap = document.getElementById('countdownWrap');
const countdownBar = document.getElementById('countdownBar');
const countdownTime = document.getElementById('countdownTime');
const multDisplay = document.getElementById('multDisplay');
const multNum = document.getElementById('multNum');
const multSub = document.getElementById('multSub');
const rocketLayer = document.getElementById('rocketLayer');
const trail = document.getElementById('trail');
const boom = document.getElementById('boom');
const floater = document.getElementById('floater');
const historyEl = document.getElementById('history');
const stage = document.getElementById('stage');
const playersList = document.getElementById('playersList');
const autoEnabledEl = document.getElementById('autoEnabled');
const autoValueEl = document.getElementById('autoValue');

function setBet(delta){ let v = parseFloat(betInput.value)||0; v += delta; betInput.value = Math.max(1, Math.round(v)); }
function halveBet(){ let v = parseFloat(betInput.value)||0; betInput.value = Math.max(1, Math.round(v/2)); }
function setBetMax(){ betInput.value = Math.max(1, Math.floor(balance*100)/100); }

function historyClass(v){ return multClass(v); }
function renderHistory(history){
  historyEl.innerHTML = history.slice(0,10).map(v => \`<div class="hchip \${historyClass(v)}">\${v.toFixed(2)}x</div>\`).join('');
}

function renderPlayers(bets){
  if(!bets || bets.length===0){ playersList.innerHTML = '<div class="empty-note">Пока никто не поставил</div>'; return; }
  playersList.innerHTML = bets.map(b=>{
    let multText, multClassName, extra;
    if(b.status==='cashed'){ multClassName='cashed'; multText = fmt(b.mult)+'x'; extra = '+'+fmt(b.amount*b.mult); }
    else if(b.status==='busted'){ multClassName='busted'; multText = fmt(b.mult)+'x'; extra = '-'+fmt(b.amount); }
    else { multClassName = multClass(currentMultiplier); multText = fmt(currentMultiplier)+'x'; extra = fmt(b.amount*currentMultiplier); }
    const nameSafe = b.username.replace(/</g,'&lt;');
    return \`<div class="player-row"><span class="player-name">\${nameSafe}</span><span class="player-amount">\${fmt(b.amount)}</span><span class="player-mult \${multClassName}">\${multText} (\${extra})</span></div>\`;
  }).join('');
}

// The server's bets[] array (sent with every tick/crash message) is the
// single source of truth for "do I have an active bet right now". We used
// to track that locally with a myBetPlaced flag set only when the button was
// clicked — if the WebSocket ever reconnected (mobile network hiccup, tab
// backgrounded, etc.) mid-round, that local flag reset while the server
// still had the bet recorded, so the UI would show "place a new bet" even
// though the real bet was still in play — it looked like the bet vanished.
// Reconciling against the server list on every message fixes that for good.
function syncMyBet(betsArr, phaseNow){
  const mine = (betsArr || []).find(b => b.username === myUsername);
  if(mine){
    myBetPlaced = true;
    betAmountLocal = mine.amount;
    myCashedOut = (mine.status === 'cashed');
    if(phaseNow === 'waiting'){
      mainBtn.className = 'main-btn locked';
      mainBtn.textContent = \`СТАВКА ПРИНЯТА: \${fmt(mine.amount)}\`;
      mainBtn.disabled = true;
      statusLine.textContent = 'Жди старта — отменить ставку нельзя';
    } else if(phaseNow === 'running'){
      if(mine.status === 'active'){
        const potential = mine.amount * currentMultiplier;
        mainBtn.className = 'main-btn cashout';
        mainBtn.disabled = false;
        mainBtn.textContent = \`ЗАБРАТЬ — \${fmt(potential)}\`;
        statusLine.textContent = \`Ставка: \${fmt(mine.amount)} → сейчас получишь \${fmt(potential)}\`;
      } else if(mine.status === 'cashed'){
        mainBtn.className = 'main-btn locked';
        mainBtn.textContent = \`ЗАБРАЛ НА \${fmt(mine.mult)}x\`;
        mainBtn.disabled = true;
      }
    } else if(phaseNow === 'crashed'){
      mainBtn.className = 'main-btn locked';
      mainBtn.disabled = true;
      if(mine.status === 'busted'){
        mainBtn.textContent = 'ПОТЕРЯНО';
      } else if(mine.status === 'cashed'){
        mainBtn.textContent = \`ЗАБРАЛ НА \${fmt(mine.mult)}x\`;
      }
    }
  } else {
    myBetPlaced = false; myCashedOut = false; betAmountLocal = 0;
    if(phaseNow === 'waiting'){
      mainBtn.className = 'main-btn place';
      mainBtn.textContent = 'СДЕЛАТЬ СТАВКУ';
      mainBtn.disabled = false;
      statusLine.textContent = 'Раунд начнётся скоро — успей поставить';
    } else if(phaseNow === 'running' || phaseNow === 'crashed'){
      mainBtn.className = 'main-btn waitnext';
      mainBtn.textContent = 'ОЖИДАНИЕ СЛЕДУЮЩЕГО РАУНДА';
      mainBtn.disabled = true;
    }
  }
}

function handleServerMessage(msg){
  if(msg.type === 'error'){
    statusLine.textContent = msg.error;
    // the bet/cashout we optimistically applied client-side didn't actually
    // go through server-side — undo the optimistic UI so the button works again
    if(phase === 'waiting' && myBetPlaced){
      myBetPlaced = false;
      mainBtn.className = 'main-btn place';
      mainBtn.textContent = 'СДЕЛАТЬ СТАВКУ';
      mainBtn.disabled = false;
    }
    return;
  }

  if(msg.type === 'auth_error'){
    // Token is dead (e.g. server restarted). Don't leave the player staring
    // at a game that silently ignores every bet — send them back to login.
    localStorage.removeItem('crash_token');
    localStorage.removeItem('crash_username');
    token = null;
    if(ws){ try{ ws.close(); }catch(e){} }
    showAuthModal();
    document.getElementById('loginError').textContent = msg.error || 'Сессия истекла, войдите заново';
    switchAuthTab('login');
    return;
  }

  if(msg.type === 'authed'){
    myUsername = msg.username; balance = msg.balance;
    localStorage.setItem('crash_username', myUsername);
    updateBalanceDisplay();
    return;
  }
  if(msg.type === 'balance'){ balance = msg.balance; updateBalanceDisplay(); return; }

  if(msg.type === 'phase'){
    phase = msg.phase;
    if(phase === 'waiting'){
      countdownWrap.style.display = 'block';
      multDisplay.style.display = 'none';
      rocketLayer.style.display = 'none';
      rocketLayer.classList.remove('flying');
      trail.style.height = '0px';
      boom.classList.remove('show');
      // button/status text is reconciled from the authoritative bets list
      // by the very next 'tick' message (see syncMyBet above) rather than
      // assumed here — that's what keeps this in sync after a reconnect.
    } else if(phase === 'running'){
      countdownWrap.style.display = 'none';
      multDisplay.style.display = 'block';
      multNum.classList.remove('crashed');
      multSub.textContent = 'ПОЛЁТ ИДЁТ';
      rocketLayer.style.display = 'block';
      rocketLayer.classList.add('flying');
    }
    return;
  }

  if(msg.type === 'tick'){
    if(msg.phase === 'waiting' && typeof msg.countdownMs === 'number'){
      const pct = (msg.countdownMs / 10000) * 100;
      countdownBar.style.width = pct + '%';
      countdownTime.textContent = (msg.countdownMs/1000).toFixed(1) + 's';
    }
    if(msg.phase === 'running' && typeof msg.multiplier === 'number'){
      currentMultiplier = msg.multiplier;
      multNum.textContent = fmt(currentMultiplier) + 'x';
      multNum.className = 'mult-num ' + multClass(currentMultiplier);
      const progress = Math.min(1, Math.log(currentMultiplier) / Math.log(20));
      const riseVh = 8 + progress*60;
      rocketLayer.style.bottom = riseVh + '%';
      trail.style.height = (riseVh*0.85) + '%';

      if(myBetPlaced && !myCashedOut && autoEnabledEl && autoEnabledEl.checked){
        const target = parseFloat(autoValueEl.value);
        if(target && target > 1 && currentMultiplier >= target){
          myCashedOut = true;
          ws.send(JSON.stringify({type:'cashout'}));
          const payout = betAmountLocal * currentMultiplier;
          showFloaterEl(floater, \`+\${fmt(payout)} @ \${fmt(currentMultiplier)}x (авто)\`, 'win');
          mainBtn.className = 'main-btn locked';
          mainBtn.textContent = \`ЗАБРАЛ НА \${fmt(currentMultiplier)}x\`;
          mainBtn.disabled = true;
          statusLine.textContent = \`Авто-кэшаут: +\${fmt(payout - betAmountLocal)}\`;
        }
      }
    }
    if(msg.history) renderHistory(msg.history);
    if(msg.bets){ renderPlayers(msg.bets); syncMyBet(msg.bets, msg.phase); }
    return;
  }

  if(msg.type === 'crash'){
    phase = 'crashed';
    rocketLayer.classList.remove('flying');
    rocketLayer.style.display = 'none';
    boom.style.bottom = rocketLayer.style.bottom || '10%';
    boom.classList.add('show');
    stage.classList.add('shake');
    setTimeout(()=>stage.classList.remove('shake'), 400);
    multNum.classList.add('crashed');
    multSub.textContent = 'КРАХ!';
    multNum.textContent = fmt(msg.crashPoint) + 'x';
    renderHistory(msg.history);
    renderPlayers(msg.bets);

    const mineBefore = (msg.bets || []).find(b => b.username === myUsername);
    syncMyBet(msg.bets, 'crashed');
    if(mineBefore && mineBefore.status === 'busted'){
      showFloaterEl(floater, \`-\${fmt(mineBefore.amount)} БУСТ\`, 'lose');
      statusLine.textContent = \`Ракета взорвалась на \${fmt(msg.crashPoint)}x\`;
    } else if(mineBefore && mineBefore.status === 'cashed'){
      statusLine.textContent = \`Ракета взорвалась на \${fmt(msg.crashPoint)}x — ты успел выйти\`;
    } else {
      statusLine.textContent = \`Ракета взорвалась на \${fmt(msg.crashPoint)}x\`;
    }
    return;
  }

  if(msg.type === 'freecrash_status'){ updateFreeStatus(msg); return; }
  if(msg.type === 'freecrash_started'){ freeRoundStart(msg.amount); return; }
  if(msg.type === 'freecrash_tick'){ freeRoundTick(msg.multiplier); return; }
  if(msg.type === 'freecrash_crash'){ freeRoundCrash(msg.crashPoint); return; }
  if(msg.type === 'freecrash_result'){ freeRoundResult(msg.multiplier, msg.payout); return; }
}

let betAmountLocal = 0;

function onMainBtn(){
  if(phase === 'waiting' && !myBetPlaced){
    const amt = parseFloat(betInput.value);
    if(!amt || amt <= 0){ statusLine.textContent = 'Введи сумму ставки больше нуля'; return; }
    if(amt > balance){ statusLine.textContent = 'Недостаточно средств на балансе'; return; }
    betAmountLocal = amt;
    myBetPlaced = true;
    ws.send(JSON.stringify({type:'bet', amount: amt}));
    mainBtn.className = 'main-btn locked';
    mainBtn.textContent = \`СТАВКА ПРИНЯТА: \${fmt(amt)}\`;
    mainBtn.disabled = true;
    statusLine.textContent = 'Жди старта — отменить ставку нельзя';
    return;
  }
  if(phase === 'running' && myBetPlaced && !myCashedOut){
    myCashedOut = true;
    ws.send(JSON.stringify({type:'cashout'}));
    const payout = betAmountLocal * currentMultiplier;
    showFloaterEl(floater, \`+\${fmt(payout)} @ \${fmt(currentMultiplier)}x\`, 'win');
    mainBtn.className = 'main-btn locked';
    mainBtn.textContent = \`ЗАБРАЛ НА \${fmt(currentMultiplier)}x\`;
    mainBtn.disabled = true;
    statusLine.textContent = \`Выигрыш: +\${fmt(payout - betAmountLocal)}\`;
  }
}

// =====================================================================
// FREE DAILY CRASH
// =====================================================================
const freeMultDisplay = document.getElementById('freeMultDisplay');
const freeMultNum = document.getElementById('freeMultNum');
const freeMultSub = document.getElementById('freeMultSub');
const freeRocketLayer = document.getElementById('freeRocketLayer');
const freeTrail = document.getElementById('freeTrail');
const freeBoom = document.getElementById('freeBoom');
const freeFloater = document.getElementById('freeFloater');
const freeBtn = document.getElementById('freeBtn');
const freeStatusLine = document.getElementById('freeStatusLine');
const stageFree = document.getElementById('stageFree');

let freeActive = false;
let freeMultiplier = 1;
let freeResetTimer = null;

function updateFreeStatus(msg){
  clearInterval(freeResetTimer);
  if(msg.available){
    freeBtn.disabled = false;
    freeBtn.textContent = 'ИГРАТЬ (бесплатно)';
    freeStatusLine.textContent = 'Доступно! Ставка 100, забери вовремя.';
  } else if(msg.nextResetAt){
    freeBtn.disabled = true;
    freeBtn.textContent = 'УЖЕ ИСПОЛЬЗОВАНО СЕГОДНЯ';
    const resetTs = new Date(msg.nextResetAt).getTime();
    freeResetTimer = setInterval(()=>{
      const remain = Math.max(0, resetTs - Date.now());
      const h = Math.floor(remain/3600000), m = Math.floor((remain%3600000)/60000), s = Math.floor((remain%60000)/1000);
      freeStatusLine.textContent = \`Следующая попытка через \${h}ч \${m}м \${s}с\`;
      if(remain<=0){ clearInterval(freeResetTimer); ws.send(JSON.stringify({type:'freecrash_check'})); }
    }, 1000);
  } else {
    freeBtn.disabled = true;
    freeBtn.textContent = 'РАУНД ИДЁТ';
    freeStatusLine.textContent = 'Раунд уже запущен...';
  }
}

function onFreeBtn(){
  if(freeBtn.disabled) return;
  ws.send(JSON.stringify({type:'freecrash_start'}));
}

function freeRoundStart(amount){
  freeActive = true;
  freeMultiplier = 1;
  freeMultSub.textContent = 'ПОЛЁТ ИДЁТ';
  freeMultNum.classList.remove('crashed');
  freeRocketLayer.style.display = 'block';
  freeRocketLayer.classList.add('flying');
  freeRocketLayer.style.bottom = '8%';
  freeTrail.style.height = '0px';
  freeBoom.classList.remove('show');
  freeBtn.className = 'main-btn cashout';
  freeBtn.disabled = false;
  freeBtn.textContent = \`ЗАБРАТЬ — \${fmt(amount)}\`;
  freeStatusLine.textContent = \`Ставка: \${amount} → сейчас получишь \${fmt(amount)}\`;
}

function freeRoundTick(mult){
  freeMultiplier = mult;
  freeMultNum.textContent = fmt(mult) + 'x';
  freeMultNum.className = 'mult-num ' + multClass(mult);
  const progress = Math.min(1, Math.log(mult) / Math.log(20));
  const riseVh = 8 + progress*60;
  freeRocketLayer.style.bottom = riseVh + '%';
  freeTrail.style.height = (riseVh*0.85) + '%';
  const potential = 100 * mult;
  freeBtn.textContent = \`ЗАБРАТЬ — \${fmt(potential)}\`;
  freeStatusLine.textContent = \`Ставка: 100 → сейчас получишь \${fmt(potential)}\`;
}

function freeRoundCrash(crashPoint){
  freeActive = false;
  freeRocketLayer.classList.remove('flying');
  freeRocketLayer.style.display = 'none';
  freeBoom.style.bottom = freeRocketLayer.style.bottom || '10%';
  freeBoom.classList.add('show');
  stageFree.classList.add('shake');
  setTimeout(()=>stageFree.classList.remove('shake'), 400);
  freeMultNum.classList.add('crashed');
  freeMultNum.textContent = fmt(crashPoint) + 'x';
  freeMultSub.textContent = 'КРАХ!';
  showFloaterEl(freeFloater, \`-100 БУСТ\`, 'lose');
  freeBtn.className = 'main-btn locked';
  freeBtn.textContent = 'ПОТЕРЯНО';
  freeStatusLine.textContent = \`Ракета взорвалась на \${fmt(crashPoint)}x — бесплатная ставка сгорела\`;
}

function freeRoundResult(mult, payout){
  freeActive = false;
  freeRocketLayer.classList.remove('flying');
  freeRocketLayer.style.display = 'none';
  showFloaterEl(freeFloater, \`+\${fmt(payout)} @ \${fmt(mult)}x\`, 'win');
  freeMultSub.textContent = 'ЗАБРАЛ';
  freeBtn.className = 'main-btn locked';
  freeBtn.textContent = \`ЗАБРАЛ НА \${fmt(mult)}x\`;
  freeStatusLine.textContent = \`Выигрыш: +\${fmt(payout-100)}. Следующая попытка завтра.\`;
}
</script>
</body>
</html>
`;

app.use(express.json());
app.get('/', (req, res) => { res.type('html').send(CLIENT_HTML); });

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ---------------------------------------------------------------------------
// PERSISTENCE (simple JSON file - see README for a Railway Volume note)
// ---------------------------------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || __dirname;
// NOTE: intentionally NOT ".json" — the dev/hot-reload watcher on this host
// restarts the process whenever a .js/.ts/.json/.html/.css file changes, and
// this file is rewritten on every bet, cashout, login and registration. With
// a .json extension that meant every bet placed triggered a full server
// restart mid-round, wiping the in-memory round state (bets + timer). The
// content is still plain JSON, just under a non-watched extension.
const DB_FILE = path.join(DATA_DIR, 'users.dat');

let users = {}; // key = username.toLowerCase() -> {username, salt, hash, balance, lastFreeCrashDate}
try {
  users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} catch (e) {
  users = {};
}
let saveTimer = null;
function saveUsers() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users));
  }, 250);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// ---------------------------------------------------------------------------
// SESSION TOKENS
// Tokens are HMAC-signed with a secret persisted on disk, so they stay valid
// across server restarts (Railway can restart the process without a redeploy
// wiping the filesystem). Previously tokens were random + kept only in an
// in-memory map, so ANY restart silently broke every logged-in session: the
// page still looked logged in (token was in localStorage) but every
// bet/cashout/free-crash message was silently rejected server-side because
// the socket could never re-authenticate. That was the root cause of
// "balance doesn't move" and "free crash doesn't work".
// ---------------------------------------------------------------------------
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
let SERVER_SECRET;
try {
  SERVER_SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim();
  if (!SERVER_SECRET) throw new Error('empty');
} catch (e) {
  SERVER_SECRET = crypto.randomBytes(32).toString('hex');
  try { fs.writeFileSync(SECRET_FILE, SERVER_SECRET); } catch (e2) { /* read-only fs: token just won't survive a restart */ }
}

function makeToken(usernameKey) {
  const sig = crypto.createHmac('sha256', SERVER_SECRET).update(usernameKey).digest('hex');
  return Buffer.from(usernameKey).toString('base64url') + '.' + sig;
}
// returns the username key if the token is valid and that user still exists, else null
function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encKey, sig] = token.split('.');
  let key;
  try { key = Buffer.from(encKey, 'base64url').toString('utf8'); } catch (e) { return null; }
  const expected = crypto.createHmac('sha256', SERVER_SECRET).update(key).digest('hex');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return users[key] ? key : null;
}

// ---------------------------------------------------------------------------
// AUTH ROUTES
// ---------------------------------------------------------------------------
app.post('/api/register', (req, res) => {
  const { username, password, confirmPassword } = req.body || {};
  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Заполни все поля' });
  }
  const uname = String(username).trim();
  if (uname.length < 3 || uname.length > 16) {
    return res.status(400).json({ error: 'Ник должен быть от 3 до 16 символов' });
  }
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9_]+$/.test(uname)) {
    return res.status(400).json({ error: 'Ник может содержать только буквы, цифры и _' });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: 'Пароль минимум 4 символа' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Пароли не совпадают' });
  }
  const key = uname.toLowerCase();
  if (users[key]) {
    return res.status(400).json({ error: 'Такой ник уже занят' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  users[key] = { username: uname, salt, hash, balance: 1000, lastFreeCrashDate: null };
  saveUsers();
  const token = makeToken(key);
  res.json({ token, username: uname, balance: 1000 });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Заполни все поля' });
  }
  const key = String(username).trim().toLowerCase();
  const user = users[key];
  if (!user) return res.status(400).json({ error: 'Неверный ник или пароль' });
  const hash = hashPassword(password, user.salt);
  if (hash !== user.hash) return res.status(400).json({ error: 'Неверный ник или пароль' });
  const token = makeToken(key);
  res.json({ token, username: user.username, balance: user.balance });
});

// ---------------------------------------------------------------------------
// SHARED GAME MATH
// ---------------------------------------------------------------------------
const GROWTH_K1 = 0.05;
const GROWTH_K2 = 0.008;
const MAX_MULTIPLIER = 999999;
const HOUSE_EDGE = 0.04;
const BETTING_MS = 10000;
const FREE_BET_AMOUNT = 100;

function genCrashPoint() {
  const r = Math.random();
  if (r < HOUSE_EDGE) return 1.00;
  let cp = (1 - HOUSE_EDGE) / (1 - r);
  cp = Math.floor(cp * 100) / 100;
  return Math.min(MAX_MULTIPLIER, Math.max(1.00, cp));
}
function timeForMultiplier(target) {
  const lnT = Math.log(target);
  const a = GROWTH_K2, b = GROWTH_K1, c = -lnT;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}
function multiplierAtTime(t) {
  return Math.min(MAX_MULTIPLIER, Math.exp(GROWTH_K1 * t + GROWTH_K2 * t * t));
}
function mskDateString(ts) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));
}
function mskNextMidnightISO() {
  // find next 00:00 Europe/Moscow as an ISO timestamp
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const mskNow = new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
  const nextMidnightMsk = new Date(Date.UTC(mskNow.getUTCFullYear(), mskNow.getUTCMonth(), mskNow.getUTCDate() + 1, 0, 0, 0));
  const diffMs = nextMidnightMsk.getTime() - mskNow.getTime();
  return new Date(now.getTime() + diffMs).toISOString();
}

// ---------------------------------------------------------------------------
// MAIN ROUND STATE (global, shared by all connected players)
// ---------------------------------------------------------------------------
let phase = 'waiting'; // waiting | running | crashed
let bettingEndTs = 0;
let roundStartTs = 0;
let crashPoint = 1;
let crashTimeSec = 0;
let currentMultiplier = 1;
let bets = {}; // key -> {username, amount, status:'active'|'cashed'|'busted', mult:number|null}
let history = [];

function betsList() {
  return Object.values(bets).map(b => ({ username: b.username, amount: b.amount, status: b.status, mult: b.mult }));
}
function broadcast(obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}
function sendTo(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function startBetting() {
  phase = 'waiting';
  bets = {};
  bettingEndTs = Date.now() + BETTING_MS;
  broadcast({ type: 'phase', phase, bettingEndTs, bettingMs: BETTING_MS });
}
function startRunning() {
  phase = 'running';
  crashPoint = genCrashPoint();
  crashTimeSec = timeForMultiplier(crashPoint);
  roundStartTs = Date.now();
  currentMultiplier = 1;
  broadcast({ type: 'phase', phase });
}
function doCrash() {
  phase = 'crashed';
  currentMultiplier = crashPoint;
  Object.values(bets).forEach(b => {
    if (b.status === 'active') { b.status = 'busted'; b.mult = crashPoint; }
  });
  history.unshift(crashPoint);
  history = history.slice(0, 10);
  broadcast({ type: 'crash', crashPoint, history, bets: betsList() });
  setTimeout(startBetting, 2500);
}

setInterval(() => {
  const now = Date.now();
  if (phase === 'waiting') {
    const remain = bettingEndTs - now;
    broadcast({ type: 'tick', phase, countdownMs: Math.max(0, remain), bets: betsList(), history });
    if (remain <= 0) startRunning();
  } else if (phase === 'running') {
    const elapsed = (now - roundStartTs) / 1000;
    if (elapsed >= crashTimeSec) { doCrash(); return; }
    currentMultiplier = multiplierAtTime(elapsed);
    broadcast({ type: 'tick', phase, multiplier: currentMultiplier, bets: betsList(), history });
  }
}, 100);

// ---------------------------------------------------------------------------
// WEBSOCKET HANDLING
// ---------------------------------------------------------------------------
wss.on('connection', (ws) => {
  let authed = null; // username key
  let freeRoundTimer = null;
  let freeRound = null; // {crashPoint, crashTimeSec, startTs, resolved}

  function clearFreeRound() {
    if (freeRoundTimer) { clearInterval(freeRoundTimer); freeRoundTimer = null; }
    freeRound = null;
  }

  function freeCrashStatus(user) {
    const today = mskDateString(Date.now());
    const usedToday = user.lastFreeCrashDate === today;
    return { available: !usedToday && !freeRound, nextResetAt: usedToday ? mskNextMidnightISO() : null };
  }

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.type === 'auth') {
      const key = verifyToken(msg.token);
      if (key) {
        authed = key;
        const user = users[key];
        sendTo(ws, { type: 'authed', username: user.username, balance: user.balance });
        sendTo(ws, { type: 'phase', phase, bettingEndTs, bettingMs: BETTING_MS });
        sendTo(ws, { type: 'tick', phase, multiplier: currentMultiplier, bets: betsList(), history });
        sendTo(ws, { type: 'freecrash_status', ...freeCrashStatus(user) });
      } else {
        // Distinct from a generic in-game error: tells the client this token
        // is dead and it should drop back to the login screen instead of
        // sitting on a broken page.
        sendTo(ws, { type: 'auth_error', error: 'Сессия недействительна, войдите заново' });
      }
      return;
    }
    if (!authed) {
      sendTo(ws, { type: 'auth_error', error: 'Сессия недействительна, войдите заново' });
      return;
    }
    const user = users[authed];

    // ----- MAIN ROUND -----
    if (msg.type === 'bet') {
      if (phase !== 'waiting') return sendTo(ws, { type: 'error', error: 'Ставки уже закрыты' });
      if (bets[authed]) return sendTo(ws, { type: 'error', error: 'Ставка уже сделана' });
      const amount = Math.floor(Number(msg.amount) * 100) / 100;
      if (!amount || amount <= 0 || amount > user.balance) {
        return sendTo(ws, { type: 'error', error: 'Некорректная сумма ставки' });
      }
      user.balance -= amount;
      saveUsers();
      bets[authed] = { username: user.username, amount, status: 'active', mult: null };
      sendTo(ws, { type: 'balance', balance: user.balance });
      broadcast({ type: 'tick', phase, countdownMs: Math.max(0, bettingEndTs - Date.now()), bets: betsList(), history });
    }

    if (msg.type === 'cashout') {
      if (phase !== 'running') return;
      const b = bets[authed];
      if (!b || b.status !== 'active') return;
      b.status = 'cashed';
      b.mult = currentMultiplier;
      user.balance += b.amount * currentMultiplier;
      saveUsers();
      sendTo(ws, { type: 'balance', balance: user.balance });
      broadcast({ type: 'tick', phase, multiplier: currentMultiplier, bets: betsList(), history });
    }

    // ----- FREE DAILY CRASH (solo, isolated round, sent only to this socket) -----
    if (msg.type === 'freecrash_start') {
      const today = mskDateString(Date.now());
      if (user.lastFreeCrashDate === today) {
        return sendTo(ws, { type: 'freecrash_status', ...freeCrashStatus(user) });
      }
      if (freeRound) return; // already running
      user.lastFreeCrashDate = today; // consumed immediately, no re-tries today
      saveUsers();

      const cp = genCrashPoint();
      const ct = timeForMultiplier(cp);
      freeRound = { crashPoint: cp, crashTimeSec: ct, startTs: Date.now(), resolved: false };
      sendTo(ws, { type: 'freecrash_started', amount: FREE_BET_AMOUNT });

      freeRoundTimer = setInterval(() => {
        if (!freeRound || freeRound.resolved) return;
        const elapsed = (Date.now() - freeRound.startTs) / 1000;
        if (elapsed >= freeRound.crashTimeSec) {
          freeRound.resolved = true;
          sendTo(ws, { type: 'freecrash_crash', crashPoint: freeRound.crashPoint });
          sendTo(ws, { type: 'freecrash_status', ...freeCrashStatus(user) });
          clearFreeRound();
          return;
        }
        const m = multiplierAtTime(elapsed);
        sendTo(ws, { type: 'freecrash_tick', multiplier: m });
      }, 100);
    }

    if (msg.type === 'freecrash_cashout') {
      if (!freeRound || freeRound.resolved) return;
      const elapsed = (Date.now() - freeRound.startTs) / 1000;
      if (elapsed >= freeRound.crashTimeSec) return; // too late, already crashed
      freeRound.resolved = true;
      const m = multiplierAtTime(elapsed);
      const payout = FREE_BET_AMOUNT * m;
      user.balance += payout;
      saveUsers();
      sendTo(ws, { type: 'freecrash_result', multiplier: m, payout });
      sendTo(ws, { type: 'balance', balance: user.balance });
      sendTo(ws, { type: 'freecrash_status', ...freeCrashStatus(user) });
      clearFreeRound();
    }

    if (msg.type === 'freecrash_check') {
      sendTo(ws, { type: 'freecrash_status', ...freeCrashStatus(user) });
    }
  });

  ws.on('close', () => { clearFreeRound(); });
});

startBetting();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Crash server listening on port', PORT));
