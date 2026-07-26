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
  /* ---------- STAIRS TAB ---------- */
  .stairs-info{padding:8px 14px 0;font-family:'Consolas',monospace;font-size:11px;color:var(--dim);text-align:center;flex:0 0 auto;}
  .stairs-info b{color:var(--amber);}
  .stairs-stage{position:relative;flex:1;min-height:160px;margin:8px 12px;border-radius:14px;overflow:hidden;
    background:radial-gradient(ellipse at 30% 20%,#10184a 0%,transparent 60%),linear-gradient(180deg,var(--bg2) 0%,#050714 100%);
    border:1px solid var(--panel-line);}
  #stairsCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
  .stairs-mult{position:absolute;top:10px;left:50%;transform:translateX(-50%);font-family:'Consolas',monospace;
    font-weight:700;font-size:clamp(22px,7vw,30px);color:var(--cyan);text-shadow:0 0 16px rgba(51,244,224,.4);z-index:5;}
  .aim-arrow{position:absolute;font-size:30px;color:#fff;transform-origin:2px 50%;
    z-index:6;text-shadow:0 0 8px rgba(255,255,255,.6);}
  .power-bar-wrap{position:absolute;left:8%;right:8%;bottom:14px;z-index:6;}
  .power-bar-track{position:relative;height:14px;border-radius:8px;background:var(--panel);border:1px solid var(--panel-line);overflow:hidden;}
  .power-bar-fill{position:absolute;top:0;bottom:0;left:0;width:0%;border-radius:8px;background:var(--amber);box-shadow:0 0 10px rgba(255,181,69,.7);}
  .power-bar-mid{position:absolute;top:-3px;bottom:-3px;left:50%;width:2px;background:var(--cyan);transform:translateX(-1px);}
  .stairs-effect-toast{position:absolute;top:46px;left:50%;transform:translateX(-50%);font-family:'Consolas',monospace;
    font-weight:700;font-size:clamp(11px,3.4vw,14px);padding:6px 14px;border-radius:20px;z-index:7;opacity:0;white-space:nowrap;}
  .stairs-effect-toast.show-red{background:rgba(255,77,94,.15);color:var(--red);border:1px solid rgba(255,77,94,.4);animation:floatUp 1.6s ease-out forwards;}
  .stairs-effect-toast.show-green{background:rgba(61,255,138,.15);color:var(--green);border:1px solid rgba(61,255,138,.4);animation:floatUp 1.6s ease-out forwards;}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
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
    <div class="tab-btn" id="tabStairsBtn" onclick="switchView('stairs')">Лестница</div>
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
    <div class="free-info" id="freeInfo">Ставка фиксирована: <b>100</b>. Забрать можно не раньше <b>1.10x</b>. Один запуск в сутки, сброс в 00:00 по МСК.</div>
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

  <!-- ============ STAIRS VIEW ============ -->
  <div class="view" id="viewStairs">
    <div class="stairs-info">Мин. ставка: <b>10</b>. Каждая пройденная ступенька: <b>+0.01x</b>. Каждая 10-я ступенька — широкая, с случайным эффектом.</div>
    <div class="stairs-stage" id="stairsStage">
      <canvas id="stairsCanvas"></canvas>
      <div class="stairs-mult" id="stairsMultDisplay">0.00x</div>
      <div class="aim-arrow" id="aimArrow" style="display:none;"><svg width="34" height="34" viewBox="0 0 24 24"><path d="M2 4 L22 12 L2 20 Z" fill="#fff"/></svg></div>
      <div class="power-bar-wrap" id="powerBarWrap" style="display:none;">
        <div class="power-bar-track"><div class="power-bar-fill" id="powerBarFill"></div><div class="power-bar-mid"></div></div>
      </div>
      <div class="stairs-effect-toast" id="stairsEffectToast"></div>
    </div>
    <div class="controls">
      <div class="bet-row">
        <input type="text" inputmode="numeric" class="bet-input" id="stairsBetInput" value="10">
        <div class="chip" onclick="setStairsBet(10)">+10</div>
        <div class="chip" onclick="setStairsBet(50)">+50</div>
        <div class="chip max-chip" onclick="setStairsBetMax()">MAX</div>
        <div class="chip" onclick="halveStairsBet()">½</div>
      </div>
      <button class="main-btn place" id="stairsBtn" onclick="onStairsBtn()">БРОСИТЬ</button>
      <div class="status-line" id="stairsStatusLine">Введи ставку и брось куб</div>
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
  // Skip while a text field is focused — on some Android WebViews even
  // window.innerHeight shrinks when the on-screen keyboard opens, which
  // would otherwise re-trigger this mid-type and fight with the keyboard.
  const active = document.activeElement;
  if(active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
  const h = window.innerHeight;
  document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
}
setVh();
window.addEventListener('resize', setVh);
window.addEventListener('orientationchange', setVh);
document.addEventListener('focusout', ()=>{ setTimeout(setVh, 50); });
// NOTE: intentionally NOT listening to window.visualViewport's 'resize' —
// that fires specifically when the on-screen keyboard opens/closes, and
// reacting to it here was recalculating the app's height while typing,
// which shifted the layout and closed the keyboard right after it opened.

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
  document.getElementById('viewStairs').classList.toggle('active', which==='stairs');
  document.getElementById('tabMainBtn').classList.toggle('active', which==='main');
  document.getElementById('tabFreeBtn').classList.toggle('active', which==='free');
  document.getElementById('tabStairsBtn').classList.toggle('active', which==='stairs');
  if(which==='stairs'){ setTimeout(stairsResizeCanvas, 0); }
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
let lastHistorySig = null;
function renderHistory(history){
  // history only actually changes once per round (at crash), but this used
  // to be called on every tick (10x/sec) and fully rebuilt the DOM every
  // time, which restarted each chip's entrance animation constantly —
  // that's what looked like the row "shaking"/lagging.
  const sig = (history || []).join(',');
  if(sig === lastHistorySig) return;
  lastHistorySig = sig;
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

  if(msg.type === 'freecrash_too_early'){
    freeStatusLine.textContent = \`Забрать можно не раньше \${fmt(msg.minMult)}x — подожди немного\`;
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
  if(freeActive){
    ws.send(JSON.stringify({type:'freecrash_cashout'}));
    return;
  }
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

// =====================================================================
// STAIRS GAME ("Лестница") — single-player, client-side only for now.
// Bet is deducted/credited purely in the browser (the shared \`balance\`
// variable) — nothing here talks to the server. That means it is NOT
// tamper-proof (someone could edit balance in devtools) — fine for a
// first playable version, but before real money is on the line this
// should move server-side the same way the crash round did.
//
// Tunable balance knobs are the STAIRS_* constants below — the exact
// numbers (cost per step, max energy, effect strengths) are a starting
// guess, not a tuned RTP. Adjust after playtesting.
// =====================================================================
const STAIRS_MIN_BET = 10;
const STAIRS_TIER_SIZE = 50;           // difficulty ramps up every N steps
const STAIRS_TIER_EFFECT_GROWTH = 0.15;// complications get +15%/tier stronger, bonuses get weaker by the same factor
const STAIRS_TIER_WIDTH_GROWTH = 0.10; // ALL steps get +10% longer per tier (every 50 steps)
const STAIRS_ANGLE_PERIOD = 1300;      // ms for one full sweep-and-back of the aim arrow
const STAIRS_POWER_PERIOD = 850;       // ms for one full sweep-and-back of the power bar
const STAIRS_STEP_W = 64;
const STAIRS_STEP_H = 30;

const stairsBetInput = document.getElementById('stairsBetInput');
const stairsBtn = document.getElementById('stairsBtn');
const stairsStatusLine = document.getElementById('stairsStatusLine');
const stairsMultDisplay = document.getElementById('stairsMultDisplay');
const aimArrow = document.getElementById('aimArrow');
const powerBarWrap = document.getElementById('powerBarWrap');
const powerBarFill = document.getElementById('powerBarFill');
const stairsEffectToast = document.getElementById('stairsEffectToast');
const stairsCanvas = document.getElementById('stairsCanvas');
const stairsCtx = stairsCanvas.getContext('2d');

const COMPLICATIONS = ['shrink','slow','lengthen25','heavy'];
const BONUSES = ['speed','grow','shorten10','springy'];
const EFFECT_LABELS = {
  shrink:'Куб уменьшился', slow:'Замедление -50%', lengthen25:'Следующие 25 ступеней длиннее',
  heavy:'Куб тяжелее +50%', speed:'Скорость +50%', grow:'Куб увеличился',
  shorten10:'Следующие 10 ступеней короче', springy:'Куб стал пружинистым!'
};

let stairs = {
  phase:'idle', bet:0, angle:0, power:0,
  steps:[], gen:null, playIndex:0, genCumX:0,
  angleStartTs:0, powerStartTs:0,
  flightState:null, x:0, y:0, vx:0, vy:0, cubeScale:1,
  launchTs:0, boosted:false,
  camX:0, camY:0, camInit:false, settleStartTs:0
};

function setStairsBet(delta){ let v=parseFloat(stairsBetInput.value)||0; v+=delta; stairsBetInput.value=Math.max(STAIRS_MIN_BET, Math.round(v)); }
function halveStairsBet(){ let v=parseFloat(stairsBetInput.value)||0; stairsBetInput.value=Math.max(STAIRS_MIN_BET, Math.round(v/2)); }
function setStairsBetMax(){ stairsBetInput.value = Math.max(STAIRS_MIN_BET, Math.floor(balance*100)/100); }

function stairsResizeCanvas(){
  const rect = stairsCanvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  stairsCanvas.width = Math.max(1, Math.round(rect.width*dpr));
  stairsCanvas.height = Math.max(1, Math.round(rect.height*dpr));
  stairsCanvas.style.width = rect.width+'px';
  stairsCanvas.style.height = rect.height+'px';
  stairsCtx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', stairsResizeCanvas);

function pingPong(t, period){
  const x = (t % period) / period;
  return x < 0.5 ? x*2 : 2-x*2;
}

// ---------------------------------------------------------------------------
// PHYSICS (Matter.js) + LAZY STEP GENERATION
// One real throw per run. The cube gets exactly one launch velocity (set
// from how good the aim/power mini-game was) and after that it is on its
// own: gravity, restitution and friction — all handled by Matter's own
// collision solver, not scripted math — are the ONLY things that ever slow
// it down. There is no "relaunch on landing": the game used to call
// launchTowardsStep again after every step, which reset velocity from
// scratch each time and made "physics decides" meaningless, since without
// an artificial energy budget the cube would just relaunch forever. That
// budget/relaunch pair is gone. The staircase itself is generated forward
// forever with no energy limit — each generated step becomes a solid
// static body (a thick block, not a thin platform, so the silhouette has
// zero gaps and the cube physically cannot pass through it) — and the run
// only ends when the real physics genuinely brings the cube to rest for
// STAIRS_SETTLE_PAUSE ms straight.
// ---------------------------------------------------------------------------
const { Engine, World, Bodies, Body, Events, Vector } = Matter;

const STAIRS_RESTITUTION = 0.72;   // bounciness on landing (0=dead stop, 1=perfectly elastic) —
                                    // raised from the old 0.55: that value was tuned back when
                                    // the cube got a fresh full-speed relaunch every landing, so
                                    // bounce height never mattered past one hop. With a single
                                    // real throw now carrying the whole run, 0.55 killed most of
                                    // the height within 2-3 bounces; 0.72 keeps the first several
                                    // bounces visibly big while still settling in finite time.
const STAIRS_BOOST_MS = 5000;      // ms after launch during which the throw runs near-elastic
                                    // (see below) — the requested "initial speed doesn't decay
                                    // for the first 5 seconds" window.
const STAIRS_RESTITUTION_BOOST = 0.98; // near-perfectly-elastic bounces during the boost window
const STAIRS_FRICTION_BOOST = 0.01;    // near-zero ground friction during the boost window —
                                        // real physics still applies (this ISN'T infinite/free
                                        // energy: gravity keeps acting, and every collision still
                                        // goes through Matter's real solver), it's just tuned so
                                        // close to elastic/frictionless that speed barely bleeds
                                        // off for the first few seconds, same as a real superball.
const STAIRS_FRICTION = 0.12;      // surface friction applied on contact (bleeds horizontal speed)
const STAIRS_SETTLE_SPEED = 18;    // px/step — below this (while touching a step) the cube counts as at rest
const STAIRS_SETTLE_PAUSE = 5000;  // ms the cube must stay genuinely at rest before the run ends (5s)
const STAIRS_RENDER_AHEAD = 40;    // how many upcoming steps to keep generated/drawn/physical
const STAIRS_X_LOOKAHEAD_PX = 2400;// always keep at least this many px of solid stairs generated
                                    // ahead of the cube's real position — index-count alone isn't
                                    // enough because widthMult varies a lot (wide/short/lengthened
                                    // steps), so a fixed step COUNT can still fall short in PIXELS
                                    // if the cube is fast; this guarantees the cube can never outrun
                                    // the generated (and therefore solid) part of the staircase.
const STAIRS_CAM_LERP = 0.14;      // camera smoothing (per-frame-at-60fps factor)
const STAIRS_BLOCK_DEPTH = 600;    // px — how far down each step block extends; keeps the
                                    // staircase solid with no seams a fast cube could clip through
const STAIRS_FIXED_DT = 1000 / 60; // ms — Matter is stepped on a fixed timestep for predictable
                                    // velocity units and to bound how far any body can move per step
const STAIRS_MAX_SUBSTEPS = 6;     // cap on catch-up steps per frame (avoids spiral-of-death on lag)

// Real launch kinematics for the ONE throw — a genuine initial velocity
// handed to the Matter body once, at the start of the run. Where it
// actually ends up is decided entirely by the engine's real collision
// solver against the real step bodies from then on (restitution + friction
// bleeding off energy on every bounce), not by scripted duration/target
// math — so the same throw can legitimately clear a handful of steps or
// dozens, depending only on real physics.
const STAIRS_HOP_VX_BASE = 12;     // px/step — horizontal launch speed at perfect aim+power (was 9)
const STAIRS_HOP_VY0_BASE = 12;    // px/step — upward launch speed at perfect aim+power (was 9;
                                    // raised so the first arc is tall enough to read as a real bounce) (arcs up, then gravity brings it down)
const STAIRS_MIN_LAUNCH_FRAC = 0.35; // even a poor throw still leaves the pad with at least this fraction of top speed

const stairsEngine = Engine.create();
const stairsWorld = stairsEngine.world;
stairsWorld.gravity.y = 1;         // standard Matter gravity direction/strength
if(stairsEngine.gravity) stairsEngine.gravity.y = 1; // some Matter versions expose gravity on the engine itself
let stairsCubeBody = null;
let stairsStepBodies = new Map(); // absolute step index -> Matter body. A plain
// array with .shift() (the old approach) silently desyncs from absolute step
// indices once the front gets trimmed — index i in the array would then no
// longer be step i. A Map keyed by the real index has no such failure mode,
// and insertion order still matches ascending index (steps are only ever
// appended in order), so the "drop bodies far behind the cube" cleanup below
// can still stop at the first entry that's still close enough.

function stairsCreateCubeBody(){
  const b = Bodies.rectangle(0, -20, 22, 22, {
    restitution: STAIRS_RESTITUTION,
    friction: STAIRS_FRICTION,
    frictionAir: 0.0008,
    label: 'cube'
  });
  World.add(stairsWorld, b);
  return b;
}

// A step's collider is a solid block from its top surface down to
// STAIRS_BLOCK_DEPTH below — adjacent blocks share their vertical edge, so
// the union of all blocks is one continuous solid staircase silhouette
// with no seam a fast-moving body could slip through.
const STAIRS_SEAM_OVERLAP = 2; // px — each block's collider is widened by this
                                // much on both sides so it overlaps its neighbours
                                // slightly instead of exactly touching them. Purely
                                // visual/exact-touching seams between separate static
                                // bodies are a classic Matter.js/Box2D "ghost collision"
                                // trap: a body sliding right along the shared edge
                                // between two different bodies can catch on that
                                // internal edge and get an extra, unintended collision
                                // response there — which reads as the cube suddenly
                                // losing speed or sticking exactly at step boundaries.
                                // Widening the (invisible) collider removes the seam;
                                // drawing still uses the true, un-widened width, so
                                // nothing changes visually.
function stairsCreateStepBody(step, index, x0, y0, w){
  const surfaceY = (index + 1) * STAIRS_STEP_H;
  const cx = x0 + w / 2;
  const cy = surfaceY + STAIRS_BLOCK_DEPTH / 2;
  const body = Bodies.rectangle(cx, cy, w + STAIRS_SEAM_OVERLAP*2, STAIRS_BLOCK_DEPTH, {
    isStatic: true,
    friction: STAIRS_FRICTION,
    restitution: STAIRS_RESTITUTION,
    label: 'step',
    stepIndex: index
  });
  World.add(stairsWorld, body);
  return body;
}

function stairsClearWorld(){
  World.clear(stairsWorld, false);
  stairsStepBodies = new Map();
  stairsCubeBody = stairsCreateCubeBody();
}

// touching/landing bookkeeping, driven by Matter collision events
let stairsTouchingStepIndex = null; // highest step index currently in contact
let stairsWasTouching = false;

function stairsMarkTouch(ev){
  for(const pair of ev.pairs){
    const stepBody = pair.bodyA.label === 'step' ? pair.bodyA : (pair.bodyB.label === 'step' ? pair.bodyB : null);
    const cubeInvolved = pair.bodyA.label === 'cube' || pair.bodyB.label === 'cube';
    if(stepBody && cubeInvolved){
      if(stairsTouchingStepIndex === null || stepBody.stepIndex > stairsTouchingStepIndex){
        stairsTouchingStepIndex = stepBody.stepIndex;
      }
      stairsWasTouching = true;
    }
  }
}
// collisionStart fires only once, the instant contact begins. While the
// cube keeps resting on a step (which Matter correctly holds it doing),
// every following tick is collisionActive, not collisionStart — missing
// that meant "still touching" was only ever true for a single tick right
// after impact (while it was still moving fast from the bounce), so the
// settle check below almost never passed and the run just froze forever
// with the cube physically parked on whatever step it first rested on.
Events.on(stairsEngine, 'collisionStart', stairsMarkTouch);
Events.on(stairsEngine, 'collisionActive', stairsMarkTouch);

function newStairsGen(){
  return {
    longUntilIdx:0, longMult:1, shortUntilIdx:0, shortMult:1, idx:0
  };
}

// Generates exactly one more step, forever — there is no energy/budget
// gate here anymore, so this never refuses to produce the next step. How
// far the cube actually gets down this endless staircase is decided
// entirely by real physics (see stairsApplyStepEffect + the Matter
// collision solver), not by how many steps the generator is willing to
// hand out.
function stairsGenNext(g){
  g.idx++;
  const idx = g.idx;
  const tier = Math.floor((idx-1) / STAIRS_TIER_SIZE);
  const tierWidthMult = 1 + tier*STAIRS_TIER_WIDTH_GROWTH; // ALL steps get longer every 50 steps

  let widthMult = tierWidthMult;
  if(idx <= g.longUntilIdx) widthMult *= g.longMult;
  if(idx <= g.shortUntilIdx) widthMult *= g.shortMult;

  let special = null, effect = null;
  const isWide = (idx % 10 === 0);
  if(isWide){
    if(Math.random() < 0.65){
      special = 'red';
      effect = COMPLICATIONS[Math.floor(Math.random()*COMPLICATIONS.length)];
      // lengthen25 is NOT committed here — see stairsCommitWidthEffect.
      // Committing it at generation time (as before) meant the RNG result
      // was baked into geometry dozens of steps ahead of the cube, so the
      // widening applied even if the cube flew straight over this step
      // without ever touching it. It's now only committed once real
      // physics confirms contact — "touch it, get it".
    } else {
      special = 'green';
      effect = BONUSES[Math.floor(Math.random()*BONUSES.length)];
      // shorten10 likewise deferred to actual touch — see stairsCommitWidthEffect.
    }
  }

  return {
    index: idx, special, effect,
    multiplier: idx/100,
    widthMult: isWide ? 2.5*tierWidthMult : widthMult
  };
}

// Commits a lengthen25/shorten10 effect the instant real physics confirms
// the cube actually reached this special step — never before. Every step
// after this one that's already been pre-generated (the lookahead buffer
// keeps dozens of steps' worth of real bodies ahead of the cube at all
// times, for collision safety) was generated BEFORE we knew whether this
// step would be touched, so it used the plain, un-widened width. To
// honor "touch it, get it" exactly, we throw those provisional bodies
// away and regenerate the tail fresh, now that the effect is confirmed.
function stairsCommitWidthEffect(step){
  // step.index is the generator's 1-based counter; array position for a
  // step with that index is (step.index - 1), so the array position right
  // AFTER it is step.index — NOT step.index + 1. The old "+1" here kept one
  // stale (pre-effect, un-widened) step behind on every commit, and then
  // stairs.gen.idx = step.index below made the generator immediately
  // re-produce that same index again — a genuine duplicate entry that
  // desynced every position/body after it, which is what made the
  // lengthen25/shorten10 effect look like it "did nothing".
  const fromIdx = step.index;
  for(let i = fromIdx; i < stairs.steps.length; i++){
    const body = stairsStepBodies.get(i);
    if(body){ World.remove(stairsWorld, body); stairsStepBodies.delete(i); }
  }
  stairs.steps.length = fromIdx;
  stairs.genCumX = stairsCumulativeXY(stairs.steps, fromIdx).x;
  stairs.gen.idx = step.index; // next stairsGenNext() call produces index fromIdx again

  const tier = Math.floor((step.index-1) / STAIRS_TIER_SIZE);
  const tierEffMult = 1 + tier*STAIRS_TIER_EFFECT_GROWTH;
  if(step.effect === 'lengthen25'){
    stairs.gen.longUntilIdx = step.index + 25; stairs.gen.longMult = 1 + 0.5*tierEffMult;
  } else if(step.effect === 'shorten10'){
    stairs.gen.shortUntilIdx = step.index + 10; stairs.gen.shortMult = Math.max(0.15, 1 - 0.5/tierEffMult);
  }
  stairsEnsureGenerated(stairs.playIndex + STAIRS_RENDER_AHEAD, stairsCubeBody.position.x + STAIRS_X_LOOKAHEAD_PX);
}

// Tops up stairs.steps so at least uptoIndex entries exist, pulling fresh
// ones from the generator on demand. No budget to run out of — the
// staircase keeps extending forward unconditionally; only real physics
// (the cube genuinely coming to rest) ever ends a run.
function stairsEnsureGenerated(minIndex, minX){
  while(stairs.steps.length <= minIndex || stairs.genCumX < minX){
    const next = stairsGenNext(stairs.gen);
    const i = stairs.steps.length;
    const x0 = stairs.genCumX;
    const w = STAIRS_STEP_W * next.widthMult;
    stairs.steps.push(next);
    stairs.genCumX += w; // running total — avoids re-summing from 0 on every call
    stairsStepBodies.set(i, stairsCreateStepBody(next, i, x0, 0, w));
  }
  // Drop step bodies that are far behind the cube — keeps the world's
  // body count bounded on long runs instead of growing forever. Iterates
  // in insertion order (== ascending index, since steps are only ever
  // appended), so it's safe to stop at the first one still close enough.
  if(stairsCubeBody){
    const behindX = stairsCubeBody.position.x - 2000;
    for(const [idx, body] of stairsStepBodies){
      if(body.bounds.max.x >= behindX) break;
      World.remove(stairsWorld, body);
      stairsStepBodies.delete(idx);
    }
  }
}

function stairsCumulativeXY(steps, uptoIndex){
  let x=0, y=0;
  for(let i=0;i<uptoIndex;i++){ x += STAIRS_STEP_W*steps[i].widthMult; y += STAIRS_STEP_H; }
  return {x,y};
}

function onStairsBtn(){
  if(stairs.phase === 'idle'){
    const bet = parseFloat(stairsBetInput.value);
    if(!bet || bet < STAIRS_MIN_BET){ stairsStatusLine.textContent = \`Минимальная ставка \${STAIRS_MIN_BET}\`; return; }
    if(bet > balance){ stairsStatusLine.textContent = 'Недостаточно средств'; return; }
    balance -= bet; updateBalanceDisplay();
    stairs = {
      phase:'aim-angle', bet, angle:0, power:0,
      steps:[], gen:null, playIndex:0, genCumX:0,
      angleStartTs: performance.now(), powerStartTs:0,
      // real-physics flight state (populated once the throw starts)
      flightState:null, x:0, y:0, vx:0, vy:0, cubeScale:1,
      launchTs:0, boosted:false,
      camX:0, camY:0, camInit:false, settleStartTs:0
    };
    stairsBtn.textContent = 'СТОП';
    stairsBtn.className = 'main-btn cashout';
    stairsBtn.disabled = false;
    aimArrow.style.display = 'block';
    powerBarWrap.style.display = 'none';
    stairsMultDisplay.textContent = '0.00x';
    stairsEffectToast.className = 'stairs-effect-toast';
    stairsStatusLine.textContent = 'Останови стрелку — выбери направление';
    return;
  }
  if(stairs.phase === 'aim-angle'){
    stairs.angle = pingPong(performance.now() - stairs.angleStartTs, STAIRS_ANGLE_PERIOD) * 90;
    stairs.phase = 'aim-power';
    stairs.powerStartTs = performance.now();
    aimArrow.style.display = 'none';
    powerBarWrap.style.display = 'block';
    stairsStatusLine.textContent = 'Останови шкалу — чем ближе к центру, тем сильнее бросок';
    return;
  }
  if(stairs.phase === 'aim-power'){
    stairs.power = pingPong(performance.now() - stairs.powerStartTs, STAIRS_POWER_PERIOD) * 100;
    powerBarWrap.style.display = 'none';
    startStairsFlight();
    return;
  }
}

function startStairsFlight(){
  // 0° = arrow points along the stairs (flat throw) → cube travels far.
  // 90° = arrow points straight up → cube barely leaves the spot.
  // These now genuinely set the launch DIRECTION (see stairsLaunchCube) —
  // before, stairs.angle only fed into an overall speed multiplier via
  // cos(angle), so the velocity's direction was always identical and only
  // its magnitude changed: wherever you stopped the arrow, the cube flew
  // the exact same trajectory, just faster or slower. Power still controls
  // the launch's overall strength.
  const powerQuality = Math.max(0, 1 - Math.abs(stairs.power - 50)/50);

  stairs.gen = newStairsGen();
  stairs.steps = [];
  stairs.genCumX = 0;
  stairs.cubeScale = 1;
  stairsClearWorld(); // fresh Matter world: new cube body, no leftover step bodies
  stairsAccMs = 0;
  stairsTouchingStepIndex = null;
  stairsWasTouching = false;
  stairsEnsureGenerated(STAIRS_RENDER_AHEAD, STAIRS_X_LOOKAHEAD_PX); // staircase is endless, this never comes back empty

  stairs.playIndex = 0;
  stairs.phase = 'flying';
  stairs.x = 0; stairs.y = 0;
  stairs.camInit = false;
  stairsBtn.disabled = true;
  stairsBtn.className = 'main-btn locked';
  stairsBtn.textContent = 'ПОЛЁТ...';
  stairsStatusLine.textContent = 'Куб летит...';
  stairsLaunchCube(stairs.angle, powerQuality);
}

// The ONE real launch for this run — a genuine initial velocity handed to
// the Matter body. angleDeg (0..90) sets the DIRECTION: 0° is a flat,
// mostly-horizontal throw (cos(0)=1 full horizontal, sin(0)=0 no upward
// component — travels far and low); 90° is straight up (cos(90)=0 no
// horizontal component at all — it just pops up and comes straight back
// down on the same step). powerQuality (0..1, from how centered the power
// bar stop was) sets the overall strength. No target position, no
// duration, and no second call later: after this the cube is entirely on
// its own, and everything about where it goes and where it finally rests
// is decided by the engine's own collision solver against the real step
// bodies (see collisionStart above and stairsPhysicsStep below).
function stairsLaunchCube(angleDeg, powerQuality){
  const angleRad = angleDeg * Math.PI/180;
  const f = STAIRS_MIN_LAUNCH_FRAC + (1 - STAIRS_MIN_LAUNCH_FRAC) * Math.min(1, Math.max(0, powerQuality));
  Body.setVelocity(stairsCubeBody, {
    x: STAIRS_HOP_VX_BASE * f * Math.cos(angleRad),
    y: -STAIRS_HOP_VY0_BASE * f * Math.sin(angleRad) // negative = upward, gravity pulls it back down
  });
  stairs.flightState = 'bounce';
  stairsTouchingStepIndex = null;
  stairsWasTouching = false;
  // Start the boost window: near-elastic restitution + near-zero friction
  // for STAIRS_BOOST_MS so the throw's speed barely bleeds off at first —
  // stairsUpdateBoostWindow (called every physics tick) switches the real
  // body back to normal restitution/friction once the window elapses.
  stairs.launchTs = performance.now();
  stairs.boosted = true;
  stairsCubeBody.restitution = STAIRS_RESTITUTION_BOOST;
  stairsCubeBody.friction = STAIRS_FRICTION_BOOST;
}

// Switches the cube between the near-elastic "boost" profile and its
// normal restitution/friction once STAIRS_BOOST_MS has passed since
// launch. Gravity and collisions are still fully real the whole time —
// this only changes how much energy each bounce keeps, exactly like a
// superball (very bouncy) settling back into an ordinary rubber ball.
function stairsUpdateBoostWindow(){
  if(!stairs.boosted) return;
  if(performance.now() - stairs.launchTs >= STAIRS_BOOST_MS){
    stairs.boosted = false;
    stairsCubeBody.restitution = STAIRS_RESTITUTION;
    stairsCubeBody.friction = STAIRS_FRICTION;
  }
}

// Applies a complication/bonus as a genuine, permanent change to the real
// Matter body the instant the cube actually reaches that step — no
// relaunch, no scripted math. From then on gravity/restitution/friction
// carry the change forward exactly like everything else about the flight.
function stairsApplyStepEffect(step){
  if(!step.special) return;
  const v = stairsCubeBody.velocity;
  if(step.effect === 'heavy'){
    Body.setMass(stairsCubeBody, stairsCubeBody.mass * 1.5);
    stairsCubeBody.frictionAir = Math.min(0.02, stairsCubeBody.frictionAir * 1.8);
  } else if(step.effect === 'slow'){
    Body.setVelocity(stairsCubeBody, { x: v.x * 0.5, y: v.y * 0.5 });
  } else if(step.effect === 'shrink'){
    stairs.cubeScale = Math.max(0.4, stairs.cubeScale * 0.75);
    Body.scale(stairsCubeBody, 0.75, 0.75);
  } else if(step.effect === 'speed'){
    Body.setVelocity(stairsCubeBody, { x: v.x * 1.5, y: v.y });
  } else if(step.effect === 'grow'){
    stairs.cubeScale = Math.min(2.2, stairs.cubeScale * 1.25);
    Body.scale(stairsCubeBody, 1.25, 1.25);
  } else if(step.effect === 'springy' && !stairs.boosted){
    // during the boost window restitution is already at/above this — don't nerf it
    stairsCubeBody.restitution = Math.min(0.95, stairsCubeBody.restitution * 1.2);
  } else if(step.effect === 'lengthen25' || step.effect === 'shorten10'){
    stairsCommitWidthEffect(step);
  }
}

// Moves playIndex forward to match every step the cube has genuinely
// reached so far, applying that step's effect (if any) and updating the
// live display. stairsTouchingStepIndex only ever increases during a
// flight (see stairsMarkTouch), so this safely catches up even if one long
// bounce carried the cube past several steps at once.
// Jumps playIndex straight to the step the cube is CURRENTLY touching.
// stairsTouchingStepIndex only tracks "highest step index ever contacted"
// — in one strong bounce the cube can clear several steps at once, and
// intermediate ones were only ever grazed in flight, never actually landed
// on. Applying every skipped step's effect in that case (the previous bug
// here) let several "heavy"/"shrink" etc. stack in a single instant —
// compounding mass/frictionAir into a near-instant stop, and scaling the
// body's collider more than once while it could already be overlapping a
// step, which is exactly what caused the erratic collisions/tunneling.
// So: only the step actually reached gets its effect and its moment on
// the display — same as the original once-per-real-landing behaviour.
function stairsAdvancePlayIndex(){
  if(stairsTouchingStepIndex === null || stairs.playIndex > stairsTouchingStepIndex) return;
  stairs.playIndex = stairsTouchingStepIndex;
  const step = stairs.steps[stairs.playIndex];
  stairsApplyStepEffect(step);
  stairsMultDisplay.textContent = fmt(step.multiplier) + 'x';
  if(step.special){
    stairsEffectToast.textContent = EFFECT_LABELS[step.effect] || '';
    stairsEffectToast.className = 'stairs-effect-toast';
    void stairsEffectToast.offsetWidth;
    stairsEffectToast.classList.add(step.special === 'red' ? 'show-red' : 'show-green');
  }
  stairs.playIndex++;
}

// Advances the Matter world on a fixed timestep (accumulator pattern) so
// velocity units stay predictable and no single step can move a body far
// enough to slip through the solid step blocks. There is no relaunch and
// no energy budget to run out of — the staircase is generated forward
// forever, and the run only ends once the real physics has genuinely
// brought the cube to rest (touching a step, below settle speed) and kept
// it there continuously for STAIRS_SETTLE_PAUSE ms. If it starts moving
// again before that, the hold timer simply resets — same as a ball that
// looked like it had stopped rolling and then tips over an edge.
let stairsAccMs = 0;
function stairsPhysicsStep(dtMs){
  stairsAccMs = Math.min(stairsAccMs + dtMs, STAIRS_FIXED_DT * STAIRS_MAX_SUBSTEPS);
  while(stairsAccMs >= STAIRS_FIXED_DT){
    stairsAccMs -= STAIRS_FIXED_DT;
    stairsWasTouching = false; // collisionStart/Active re-sets this to true if still in contact
    Engine.update(stairsEngine, STAIRS_FIXED_DT);
    stairsUpdateBoostWindow();

    // keep the staircase generated ahead of wherever the cube has actually flown to
    stairsEnsureGenerated(stairs.playIndex + STAIRS_RENDER_AHEAD, stairsCubeBody.position.x + STAIRS_X_LOOKAHEAD_PX);
    stairsAdvancePlayIndex();

    if(stairsWasTouching){
      const speed = Vector.magnitude(stairsCubeBody.velocity);
      if(speed < STAIRS_SETTLE_SPEED){
        if(stairs.flightState !== 'settling'){
          stairs.flightState = 'settling';
          stairs.settleStartTs = performance.now();
        }
      } else {
        stairs.flightState = 'bounce'; // still touching, but real speed says it isn't done yet
      }
    } else if(stairsTouchingStepIndex !== null){
      stairs.flightState = 'bounce'; // airborne between bounces
    }
  }
  if(stairs.flightState === 'settling' && performance.now() - stairs.settleStartTs >= STAIRS_SETTLE_PAUSE){
    finishStairsRun();
  }
}

function finishStairsRun(){
  const finalMult = stairs.playIndex > 0 ? stairs.steps[stairs.playIndex-1].multiplier : 0;
  const payout = Math.round(stairs.bet * finalMult * 100) / 100;
  balance += payout;
  updateBalanceDisplay();
  stairs.phase = 'idle';
  stairs.flightState = null;
  stairsBtn.disabled = false;
  stairsBtn.className = 'main-btn place';
  stairsBtn.textContent = 'БРОСИТЬ';
  stairsStatusLine.textContent = payout > 0
    ? \`Куб остановился на \${fmt(finalMult)}x — выигрыш \${fmt(payout)}\`
    : 'Куб не прошёл ни одной ступени — ставка сгорела';
}

function drawStairsCanvas(){
  const w = stairsCanvas.clientWidth, h = stairsCanvas.clientHeight;
  stairsCtx.clearRect(0,0,w,h);
  if(!stairs.steps.length){
    // Pre-flight preview (aiming phases, before the first throw): shows the
    // checkered starting pad with the cube RESTING on its top surface — not
    // hovering above it. It used to be drawn at y=-20 (the cube body's real
    // spawn height, which is meant to be a brief pre-launch offset, not a
    // resting pose) with nothing else visible under it for the whole aiming
    // phase, so it just floated in empty space the entire time the player
    // was aiming. The real spawn is unchanged (stairsCreateCubeBody still
    // spawns at (0,-20) right before launch) — only this preview pose,
    // shown before that ever happens, is fixed to sit flush on the pad.
    const padW = STAIRS_STEP_W, padH = STAIRS_STEP_H;
    const size = 22;
    const restY = STAIRS_STEP_H - size/2; // sits flush on the pad's top surface
    const camX = 0 - w*0.30, camY = restY - h*0.30;
    const px = 0 - camX, py = STAIRS_STEP_H - camY;
    const tile = 8;
    for(let ty=0; ty<padH; ty+=tile){
      for(let tx=0; tx<padW; tx+=tile){
        const dark = (Math.floor(tx/tile) + Math.floor(ty/tile)) % 2 === 0;
        stairsCtx.fillStyle = dark ? '#0a0e22' : '#e8ecff';
        stairsCtx.fillRect(px+tx, py+ty, tile, tile);
      }
    }
    stairsCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    stairsCtx.strokeRect(px, py, padW, padH);

    stairsCtx.save();
    stairsCtx.translate(0 - camX, restY - camY);
    stairsCtx.fillStyle = '#c48bff';
    stairsCtx.fillRect(-size/2, -size/2, size, size);
    stairsCtx.strokeStyle = '#3a1a66';
    stairsCtx.lineWidth = 2;
    stairsCtx.strokeRect(-size/2, -size/2, size, size);
    stairsCtx.restore();
    return;
  }

  // Mirror the real Matter body position — this IS the physics engine's
  // actual current position, not a hand-integrated approximation of it.
  if(stairsCubeBody){ stairs.x = stairsCubeBody.position.x; stairs.y = stairsCubeBody.position.y; }

  // Camera lerps toward the cube's real (continuous) position every frame
  // instead of jumping between discrete per-step anchors.
  const targetCamX = stairs.x - w*0.30;
  const targetCamY = stairs.y - h*0.30;
  if(!stairs.camInit){ stairs.camX = targetCamX; stairs.camY = targetCamY; stairs.camInit = true; }
  const lerpT = 1 - Math.pow(1 - STAIRS_CAM_LERP, (stairsLastDt||0.016)*60);
  stairs.camX += (targetCamX - stairs.camX) * lerpT;
  stairs.camY += (targetCamY - stairs.camY) * lerpT;

  const startIdx = Math.max(0, stairs.playIndex - 2);
  const base = stairsCumulativeXY(stairs.steps, startIdx);
  let dx = base.x, dy = base.y + STAIRS_STEP_H;
  // +STAIRS_STEP_H above: a step's real physics surface sits at
  // (index+1)*STAIRS_STEP_H (see stairsCreateStepBody), one full step
  // height below the plain cumulative sum used for stairsCumulativeXY.
  // Drawing at the un-shifted sum put every tread's rectangle a whole
  // STAIRS_STEP_H above where the real solid body actually starts — so
  // the (correctly-positioned) cube's true resting point landed at the
  // BOTTOM edge of the drawn rectangle instead of its top, i.e. visually
  // buried a full step-height deep in the block. This was already wrong
  // before any of the physics changes; it just wasn't visible while the
  // cube kept relaunching instead of sitting still.
  for(let i=startIdx; i<Math.min(stairs.steps.length, startIdx+STAIRS_RENDER_AHEAD); i++){
    const st = stairs.steps[i];
    const sw = STAIRS_STEP_W*st.widthMult, sh = STAIRS_STEP_H;
    const px = dx - stairs.camX, py = dy - stairs.camY;
    if(i === 0){
      // Step 0 is the starting platform — draw it with the exact same
      // checkered look as the pre-flight preview pad, so nothing visually
      // "disappears" the instant flight starts; it's the same platform,
      // just now a real physics body underneath it too.
      const tile = 8;
      for(let ty=0; ty<sh; ty+=tile){
        for(let tx=0; tx<sw; tx+=tile){
          const dark = (Math.floor(tx/tile) + Math.floor(ty/tile)) % 2 === 0;
          stairsCtx.fillStyle = dark ? '#0a0e22' : '#e8ecff';
          stairsCtx.fillRect(px+tx, py+ty, Math.min(tile, sw-tx), Math.min(tile, sh-ty));
        }
      }
      stairsCtx.strokeStyle = 'rgba(255,255,255,0.25)';
      stairsCtx.strokeRect(px, py, sw, sh);
      dx += sw; dy += sh;
      continue;
    }
    let color = '#16204a';
    if(st.special === 'red') color = 'rgba(255,77,94,0.35)';
    else if(st.special === 'green') color = 'rgba(61,255,138,0.30)';
    else if(st.widthMult !== 1) color = 'rgba(255,181,69,0.20)';
    stairsCtx.fillStyle = color;
    stairsCtx.fillRect(px, py, sw, sh);
    stairsCtx.strokeStyle = 'rgba(255,255,255,0.15)';
    stairsCtx.strokeRect(px, py, sw, sh);
    dx += sw; dy += sh;
  }

  const size = 22 * (stairs.cubeScale || 1);
  const cx = stairs.x - stairs.camX;
  const cy = stairs.y - stairs.camY;
  stairsCtx.save();
  stairsCtx.translate(cx, cy);
  // Real physics rotation — Matter genuinely spins this body via collision
  // torque (it's a free rectangle, no rotation lock), so the drawn cube
  // must use its real body.angle. The old formula (stairs.x*0.06) was a
  // fake "rolling" spin completely disconnected from the real physics —
  // that's why the cube visibly rested at a random tilt instead of flush
  // on a step: the drawing simply wasn't showing its real orientation.
  stairsCtx.rotate(stairsCubeBody.angle);
  stairsCtx.fillStyle = '#c48bff';
  stairsCtx.fillRect(-size/2, -size/2, size, size);
  stairsCtx.strokeStyle = '#3a1a66';
  stairsCtx.lineWidth = 2;
  stairsCtx.strokeRect(-size/2, -size/2, size, size);
  stairsCtx.restore();
}

let stairsLastTs = 0, stairsLastDt = 0;
function stairsPositionAimArrow(){
  // Anchors the arrow's pivot (its tail, see transform-origin) exactly on
  // the cube's real on-screen position — computed from the canvas's actual
  // rect rather than a guessed CSS percentage, so it can't drift out of
  // sync with the stage's padding/border on any given screen. The cube's
  // own preview position is canvas-relative (0.30w, 0.30h) — see the
  // pre-flight preview branch in drawStairsCanvas — so this mirrors that
  // exactly.
  const stageEl = document.getElementById('stairsStage');
  const stageRect = stageEl.getBoundingClientRect();
  const canvasRect = stairsCanvas.getBoundingClientRect();
  const cubeX = (canvasRect.left - stageRect.left) + canvasRect.width * 0.30;
  const cubeY = (canvasRect.top - stageRect.top) + canvasRect.height * 0.30;
  aimArrow.style.left = cubeX + 'px';
  aimArrow.style.top = cubeY + 'px';
}

function stairsFrame(ts){
  const dt = stairsLastTs ? Math.min(0.05, (ts - stairsLastTs)/1000) : 0;
  stairsLastTs = ts;
  if(dt > 0) stairsLastDt = dt;

  if(stairs.phase === 'aim-angle'){
    const ang = pingPong(ts - stairs.angleStartTs, STAIRS_ANGLE_PERIOD) * 90;
    // The SVG triangle's tip points right at 0deg, so rotate(-ang) sweeps
    // it counter-clockwise from "right" (0°, flat throw) up to "straight
    // up" (90°) — meaning 45° lands exactly on the upper-right diagonal,
    // as it should.
    stairsPositionAimArrow();
    aimArrow.style.transform = \`rotate(\${-ang}deg)\`;
    drawStairsCanvas();
  } else if(stairs.phase === 'aim-power'){
    const pct = pingPong(ts - stairs.powerStartTs, STAIRS_POWER_PERIOD) * 100;
    powerBarFill.style.width = pct + '%';
    drawStairsCanvas();
  } else if(stairs.phase === 'flying'){
    if(dt > 0) stairsPhysicsStep(dt * 1000);
    drawStairsCanvas();
  }
  requestAnimationFrame(stairsFrame);
}
requestAnimationFrame(stairsFrame);
</script>
</body>
</html>
`;

app.use(express.json());
app.get('/', (req, res) => { res.type('html').send(CLIENT_HTML); });

// ---------------------------------------------------------------------------
// TEMPORARY ADMIN ROUTE — resets everyone's free-crash "used today" flag.
// Visit: https://<your-app>.bonto.run/admin/reset-free-crash?key=orbit-reset-2026
// Safe to leave for now, but remove this route (and the line below) once
// you've used it — anyone who knows the URL+key can trigger it.
// ---------------------------------------------------------------------------
app.get('/admin/reset-free-crash', (req, res) => {
  if (req.query.key !== 'orbit-reset-2026') return res.status(403).send('forbidden');
  let count = 0;
  for (const k in users) {
    if (users[k].lastFreeCrashDate) { users[k].lastFreeCrashDate = null; count++; }
  }
  saveUsers();
  res.type('text').send(`OK — reset lastFreeCrashDate for ${count} user(s).`);
});

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
const FREE_MIN_CASHOUT_MULT = 1.10; // can't cash out before this multiplier

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
      const m = multiplierAtTime(elapsed);
      if (m < FREE_MIN_CASHOUT_MULT) {
        return sendTo(ws, { type: 'freecrash_too_early', minMult: FREE_MIN_CASHOUT_MULT, multiplier: m });
      }
      freeRound.resolved = true;
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
