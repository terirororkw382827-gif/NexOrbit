const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const WebSocket = require('ws');

const app = express();
const CLIENT_HTML = "<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover\">\n<title>ORBIT // CRASH</title>\n<style>\n  :root{\n    --bg:#050714; --bg2:#0a0f26; --panel:#0d1330; --panel-line:#1c254f;\n    --text:#e8ecff; --dim:#8188ab;\n    --red:#ff4d5e; --amber:#ffb545; --cyan:#33f4e0; --purple:#c48bff; --green:#33ff88;\n  }\n  *{box-sizing:border-box; -webkit-tap-highlight-color:transparent;}\n  html,body{margin:0;padding:0;background:var(--bg);color:var(--text);\n    font-family:'Segoe UI',Roboto,Arial,sans-serif;height:100%;overflow:hidden;user-select:none;}\n  .app{max-width:520px;margin:0 auto;height:100dvh;height:100vh;display:flex;flex-direction:column;position:relative;}\n\n  /* ---------- AUTH MODAL ---------- */\n  .modal-overlay{position:fixed;inset:0;background:rgba(3,5,15,.92);z-index:100;\n    display:flex;align-items:center;justify-content:center;padding:16px;}\n  .modal-box{width:100%;max-width:380px;background:var(--panel);border:1px solid var(--panel-line);\n    border-radius:16px;padding:22px;}\n  .modal-title{font-family:'Consolas',monospace;font-size:20px;letter-spacing:2px;text-align:center;margin-bottom:4px;}\n  .modal-title b{color:var(--cyan);}\n  .modal-tabs{display:flex;gap:8px;margin:16px 0 14px;}\n  .modal-tab{flex:1;text-align:center;padding:9px;border-radius:8px;font-size:13px;cursor:pointer;\n    background:var(--bg2);border:1px solid var(--panel-line);color:var(--dim);font-family:'Consolas',monospace;}\n  .modal-tab.active{color:var(--cyan);border-color:var(--cyan);}\n  .modal-field{margin-bottom:10px;}\n  .modal-field input{width:100%;background:var(--bg2);border:1px solid var(--panel-line);color:var(--text);\n    padding:11px 12px;border-radius:9px;font-size:15px;outline:none;font-family:'Consolas',monospace;}\n  .modal-error{color:var(--red);font-size:12px;min-height:16px;margin:6px 0 8px;font-family:'Consolas',monospace;}\n  .modal-submit{width:100%;padding:13px;border:none;border-radius:10px;font-weight:700;letter-spacing:1px;\n    background:linear-gradient(90deg,var(--cyan),#1fd8c4);color:#03231f;cursor:pointer;font-size:15px;}\n\n  /* ---------- TOP BAR ---------- */\n  .topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 6px;z-index:5;flex:0 0 auto;}\n  .brand{font-family:'Consolas',monospace;letter-spacing:2px;font-size:clamp(10px,3vw,13px);color:var(--dim);white-space:nowrap;}\n  .brand b{color:var(--cyan);}\n  .user-balance{display:flex;align-items:center;gap:8px;font-family:'Consolas',monospace;font-size:clamp(12px,3.4vw,15px);}\n  .balance-box{background:var(--panel);border:1px solid var(--panel-line);padding:6px 10px;border-radius:8px;}\n  .balance-box span{color:var(--amber);font-weight:bold;}\n  .username-tag{color:var(--dim);font-size:11px;}\n\n  /* ---------- TABS ---------- */\n  .tabbar{display:flex;gap:6px;padding:0 14px 8px;flex:0 0 auto;}\n  .tab-btn{flex:1;text-align:center;padding:9px 4px;border-radius:9px;font-size:clamp(11px,3vw,13px);\n    background:var(--panel);border:1px solid var(--panel-line);color:var(--dim);font-family:'Consolas',monospace;cursor:pointer;}\n  .tab-btn.active{color:var(--bg);background:linear-gradient(90deg,var(--cyan),#1fd8c4);border-color:transparent;}\n\n  .view{display:none;flex:1;min-height:0;flex-direction:column;}\n  .view.active{display:flex;}\n\n  /* ---------- STAGE ---------- */\n  .stage{position:relative;flex:1;min-height:120px;margin:0 12px;border-radius:14px;overflow:hidden;\n    background:radial-gradient(ellipse at 50% 100%,#10184a 0%,transparent 60%),linear-gradient(180deg,var(--bg2) 0%,#050714 100%);\n    border:1px solid var(--panel-line);}\n  .grid-lines{position:absolute;inset:0;\n    background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 40px),\n      repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 40px);\n    mask-image:radial-gradient(ellipse at 50% 80%,black 30%,transparent 75%);}\n  .star{position:absolute;background:#fff;border-radius:50%;opacity:.5;animation:twinkle 2.6s ease-in-out infinite;}\n  @keyframes twinkle{0%,100%{opacity:.15;}50%{opacity:.9;}}\n\n  .mult-display{position:absolute;top:16%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:4;width:90%;}\n  .mult-num{font-family:'Consolas',monospace;font-weight:700;font-size:clamp(30px,10vw,54px);letter-spacing:1px;\n    color:var(--cyan);transition:color .25s;}\n  .mult-num.low{color:var(--red);text-shadow:0 0 22px rgba(255,77,94,.5);}\n  .mult-num.mid{color:var(--amber);text-shadow:0 0 22px rgba(255,181,69,.45);}\n  .mult-num.high{color:var(--cyan);text-shadow:0 0 22px rgba(51,244,224,.45);}\n  .mult-num.super{color:var(--purple);text-shadow:0 0 24px rgba(196,139,255,.5);}\n  .mult-num.white{color:#ffffff;text-shadow:0 0 26px rgba(255,255,255,.7);}\n  .mult-num.rainbow{background:linear-gradient(90deg,#ff4d4d,#ffb545,#f4ff5e,#33ff88,#33d4ff,#a366ff,#ff4d4d);\n    background-size:400% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;\n    animation:rainbowShift 2.6s linear infinite;}\n  @keyframes rainbowShift{0%{background-position:0% 50%;}100%{background-position:400% 50%;}}\n  .mult-num.crashed{color:var(--red)!important;background:none!important;-webkit-text-fill-color:var(--red);\n    text-shadow:0 0 28px rgba(255,77,94,.6);}\n  .mult-sub{margin-top:2px;font-size:clamp(10px,2.6vw,13px);color:var(--dim);letter-spacing:2px;font-family:'Consolas',monospace;}\n\n  .countdown-wrap{position:absolute;top:16%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:4;width:80%;max-width:220px;}\n  .countdown-label{font-size:clamp(9px,2.6vw,12px);letter-spacing:2px;color:var(--dim);margin-bottom:8px;font-family:'Consolas',monospace;}\n  .countdown-bar-bg{height:6px;border-radius:4px;background:var(--panel-line);overflow:hidden;}\n  .countdown-bar{height:100%;background:linear-gradient(90deg,var(--cyan),var(--amber));width:100%;transition:width .1s linear;}\n  .countdown-time{margin-top:6px;font-family:'Consolas',monospace;font-size:clamp(16px,5vw,22px);}\n\n  .rocket-wrap{position:absolute;left:50%;bottom:8%;transform:translate(-50%,0);z-index:3;\n    width:clamp(34px,11vw,50px);}\n  .rocket-wrap.flying{animation:wobble 1.1s ease-in-out infinite;}\n  @keyframes wobble{0%,100%{margin-left:-5px;}50%{margin-left:5px;}}\n  .rocket-svg{width:100%;height:auto;filter:drop-shadow(0 0 8px rgba(51,244,224,.35));}\n  .flame{transform-origin:30px 95px;animation:flameFlicker .18s ease-in-out infinite alternate;}\n  @keyframes flameFlicker{0%{transform:scaleY(.85) scaleX(.9);}100%{transform:scaleY(1.15) scaleX(1.05);}}\n  .trail{position:absolute;left:50%;bottom:0;width:3px;background:linear-gradient(180deg,rgba(255,181,69,.6),rgba(255,181,69,0));\n    transform:translate(-50%,0);border-radius:2px;z-index:2;}\n  .boom{position:absolute;left:50%;font-size:clamp(38px,12vw,60px);transform:translate(-50%,-50%) scale(.4);opacity:0;z-index:5;}\n  .boom.show{animation:boomPop .6s ease-out forwards;}\n  @keyframes boomPop{0%{transform:translate(-50%,-50%) scale(.3);opacity:0;}30%{transform:translate(-50%,-50%) scale(1.3);opacity:1;}\n    100%{transform:translate(-50%,-50%) scale(1.6);opacity:0;}}\n  .shake{animation:screenShake .4s;}\n  @keyframes screenShake{0%,100%{transform:translate(0,0);}20%{transform:translate(-4px,3px);}40%{transform:translate(4px,-3px);}\n    60%{transform:translate(-3px,-2px);}80%{transform:translate(3px,2px);}}\n\n  .floater{position:absolute;left:50%;bottom:20%;transform:translate(-50%,0);font-family:'Consolas',monospace;font-weight:bold;\n    font-size:clamp(12px,3.6vw,15px);padding:6px 14px;border-radius:20px;z-index:6;opacity:0;white-space:nowrap;}\n  .floater.win{background:rgba(51,244,224,.12);color:var(--cyan);border:1px solid rgba(51,244,224,.4);}\n  .floater.lose{background:rgba(255,77,94,.12);color:var(--red);border:1px solid rgba(255,77,94,.4);}\n  .floater.show{animation:floatUp 1.8s ease-out forwards;}\n  @keyframes floatUp{0%{opacity:0;transform:translate(-50%,10px);}15%{opacity:1;transform:translate(-50%,0);}\n    80%{opacity:1;}100%{opacity:0;transform:translate(-50%,-30px);}}\n\n  /* ---------- CONTROLS ---------- */\n  .controls{padding:10px 14px;flex:0 0 auto;}\n  .bet-row{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;}\n  .bet-input{flex:1 1 90px;min-width:0;background:var(--panel);border:1px solid var(--panel-line);color:var(--text);\n    font-family:'Consolas',monospace;font-size:clamp(13px,3.8vw,16px);padding:9px 10px;border-radius:9px;outline:none;}\n  .chip{background:var(--panel);border:1px solid var(--panel-line);color:var(--dim);font-family:'Consolas',monospace;\n    padding:9px 9px;border-radius:9px;font-size:clamp(10px,2.8vw,12px);cursor:pointer;flex:0 0 auto;}\n  .chip.max-chip{color:var(--amber);border-color:rgba(255,181,69,.4);}\n  .chip:active{background:var(--panel-line);}\n\n  .main-btn{width:100%;padding:14px;border:none;border-radius:11px;font-size:clamp(13px,4vw,16px);font-weight:700;\n    letter-spacing:1px;cursor:pointer;font-family:'Consolas',monospace;transition:transform .08s;}\n  .main-btn:active{transform:scale(.98);}\n  .main-btn.place{background:linear-gradient(90deg,var(--cyan),#1fd8c4);color:#03231f;}\n  .main-btn.cashout{background:linear-gradient(90deg,var(--amber),#ff8a3d);color:#2b1500;}\n  .main-btn.waitnext,.main-btn.locked{background:var(--panel);color:var(--dim);border:1px solid var(--panel-line);cursor:default;}\n  .main-btn:disabled{opacity:.55;cursor:default;}\n  .status-line{text-align:center;font-size:clamp(10px,2.8vw,12px);color:var(--dim);margin-top:7px;\n    font-family:'Consolas',monospace;min-height:15px;}\n\n  /* ---------- HISTORY + PLAYERS ---------- */\n  .history{display:flex;gap:6px;padding:0 14px 8px;overflow-x:auto;flex:0 0 auto;}\n  .history::-webkit-scrollbar{display:none;}\n  .hchip{flex:0 0 auto;padding:5px 9px;border-radius:8px;font-family:'Consolas',monospace;font-size:clamp(11px,3vw,13px);\n    font-weight:700;background:var(--panel);border:1px solid var(--panel-line);animation:chipIn .3s ease-out;}\n  @keyframes chipIn{0%{transform:scale(.6);opacity:0;}100%{transform:scale(1);opacity:1;}}\n  .hchip.low{color:var(--red);} .hchip.mid{color:var(--amber);} .hchip.high{color:var(--cyan);}\n  .hchip.super{color:var(--purple);} .hchip.white{color:#fff;}\n  .hchip.rainbow{background:linear-gradient(90deg,#ff4d4d,#ffb545,#f4ff5e,#33ff88,#33d4ff,#a366ff);\n    -webkit-background-clip:text;background-clip:text;color:transparent;}\n\n  .players-panel{flex:0 0 auto;max-height:26vh;overflow-y:auto;padding:0 14px 12px;}\n  .players-title{font-size:11px;color:var(--dim);letter-spacing:2px;font-family:'Consolas',monospace;margin-bottom:6px;}\n  .player-row{display:flex;align-items:center;justify-content:space-between;gap:8px;\n    background:var(--panel);border:1px solid var(--panel-line);border-radius:9px;padding:7px 10px;margin-bottom:5px;\n    font-family:'Consolas',monospace;font-size:clamp(11px,3vw,13px);}\n  .player-name{color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:38%;}\n  .player-amount{color:var(--dim);}\n  .player-mult{font-weight:700;}\n  .player-mult.cashed{color:var(--green);}\n  .player-mult.busted{color:var(--red);}\n  .empty-note{color:var(--dim);font-size:12px;text-align:center;padding:6px;font-family:'Consolas',monospace;}\n\n  /* ---------- FREE CRASH TAB ---------- */\n  .free-info{padding:10px 14px 0;font-family:'Consolas',monospace;font-size:12px;color:var(--dim);text-align:center;flex:0 0 auto;}\n  .free-info b{color:var(--amber);}\n\n  @media (max-width:360px){\n    .bet-row{gap:5px;}\n    .chip{padding:8px 7px;}\n  }\n</style>\n</head>\n<body>\n<div class=\"app\" id=\"app\">\n\n  <!-- AUTH MODAL -->\n  <div class=\"modal-overlay\" id=\"authModal\">\n    <div class=\"modal-box\">\n      <div class=\"modal-title\">ORBIT // <b>CRASH</b></div>\n      <div class=\"modal-tabs\">\n        <div class=\"modal-tab active\" id=\"tabLogin\" onclick=\"switchAuthTab('login')\">Вход</div>\n        <div class=\"modal-tab\" id=\"tabRegister\" onclick=\"switchAuthTab('register')\">Регистрация</div>\n      </div>\n\n      <div id=\"loginForm\">\n        <div class=\"modal-field\"><input type=\"text\" id=\"loginUsername\" placeholder=\"Ник\" autocomplete=\"username\"></div>\n        <div class=\"modal-field\"><input type=\"password\" id=\"loginPassword\" placeholder=\"Пароль\" autocomplete=\"current-password\"></div>\n        <div class=\"modal-error\" id=\"loginError\"></div>\n        <button class=\"modal-submit\" onclick=\"doLogin()\">Войти</button>\n      </div>\n\n      <div id=\"registerForm\" style=\"display:none;\">\n        <div class=\"modal-field\"><input type=\"text\" id=\"regUsername\" placeholder=\"Ник (3-16 символов)\" autocomplete=\"username\"></div>\n        <div class=\"modal-field\"><input type=\"password\" id=\"regPassword\" placeholder=\"Пароль (мин. 4 симв.)\" autocomplete=\"new-password\"></div>\n        <div class=\"modal-field\"><input type=\"password\" id=\"regPassword2\" placeholder=\"Повтори пароль\" autocomplete=\"new-password\"></div>\n        <div class=\"modal-error\" id=\"regError\"></div>\n        <button class=\"modal-submit\" onclick=\"doRegister()\">Создать аккаунт</button>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"topbar\">\n    <div class=\"brand\">ORBIT // <b>CRASH</b></div>\n    <div class=\"user-balance\">\n      <span class=\"username-tag\" id=\"userTag\"></span>\n      <div class=\"balance-box\">💰 <span id=\"balance\">0.00</span></div>\n    </div>\n  </div>\n\n  <div class=\"tabbar\">\n    <div class=\"tab-btn active\" id=\"tabMainBtn\" onclick=\"switchView('main')\">Обычный краш</div>\n    <div class=\"tab-btn\" id=\"tabFreeBtn\" onclick=\"switchView('free')\">Бесплатный краш (1/день)</div>\n  </div>\n\n  <!-- ============ MAIN VIEW ============ -->\n  <div class=\"view active\" id=\"viewMain\">\n    <div class=\"stage\" id=\"stage\">\n      <div class=\"grid-lines\"></div>\n      <div class=\"star\" id=\"starsHolder\"></div>\n\n      <div class=\"countdown-wrap\" id=\"countdownWrap\">\n        <div class=\"countdown-label\">СЛЕДУЮЩИЙ ЗАПУСК ЧЕРЕЗ</div>\n        <div class=\"countdown-bar-bg\"><div class=\"countdown-bar\" id=\"countdownBar\"></div></div>\n        <div class=\"countdown-time\" id=\"countdownTime\">10.0s</div>\n      </div>\n\n      <div class=\"mult-display\" id=\"multDisplay\" style=\"display:none;\">\n        <div class=\"mult-num\" id=\"multNum\">1.00x</div>\n        <div class=\"mult-sub\" id=\"multSub\">ПОЛЁТ ИДЁТ</div>\n      </div>\n\n      <div class=\"trail\" id=\"trail\" style=\"height:0;\"></div>\n      <div class=\"rocket-wrap\" id=\"rocketLayer\" style=\"display:none;\">\n        <svg class=\"rocket-svg\" viewBox=\"0 0 60 140\">\n          <defs>\n            <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n              <stop offset=\"0%\" stop-color=\"#f2f5ff\"/><stop offset=\"100%\" stop-color=\"#a9b4e8\"/>\n            </linearGradient>\n            <radialGradient id=\"flameGrad\" cx=\"50%\" cy=\"0%\" r=\"80%\">\n              <stop offset=\"0%\" stop-color=\"#fff6c8\"/><stop offset=\"45%\" stop-color=\"#ffb545\"/><stop offset=\"100%\" stop-color=\"rgba(255,107,53,0)\"/>\n            </radialGradient>\n          </defs>\n          <ellipse class=\"flame\" cx=\"30\" cy=\"112\" rx=\"9\" ry=\"26\" fill=\"url(#flameGrad)\"/>\n          <path d=\"M12 100 L-2 122 L12 114 Z\" fill=\"#ff6b35\"/>\n          <path d=\"M48 100 L62 122 L48 114 Z\" fill=\"#ff6b35\"/>\n          <path d=\"M30 2 C44 26 47 68 47 96 L13 96 C13 68 16 26 30 2 Z\" fill=\"url(#bodyGrad)\" stroke=\"#1c254f\" stroke-width=\"2\"/>\n          <circle cx=\"30\" cy=\"46\" r=\"9\" fill=\"#33f4e0\" stroke=\"#0d1330\" stroke-width=\"2.5\"/>\n        </svg>\n      </div>\n      <div class=\"boom\" id=\"boom\">💥</div>\n      <div class=\"floater\" id=\"floater\"></div>\n    </div>\n\n    <div class=\"controls\">\n      <div class=\"bet-row\">\n        <input type=\"text\" inputmode=\"numeric\" class=\"bet-input\" id=\"betInput\" value=\"100\">\n        <div class=\"chip\" onclick=\"setBet(50)\">+50</div>\n        <div class=\"chip\" onclick=\"setBet(100)\">+100</div>\n        <div class=\"chip max-chip\" onclick=\"setBetMax()\">MAX</div>\n        <div class=\"chip\" onclick=\"halveBet()\">½</div>\n      </div>\n      <div class=\"autoco-row\" style=\"display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;color:var(--dim);font-family:'Consolas',monospace;\">\n        <input type=\"checkbox\" id=\"autoEnabled\" style=\"accent-color:var(--cyan);\">\n        <label for=\"autoEnabled\">Авто-кэшаут при</label>\n        <input type=\"text\" inputmode=\"decimal\" id=\"autoValue\" value=\"2.00\" style=\"width:60px;background:var(--panel);border:1px solid var(--panel-line);color:var(--text);padding:5px 7px;border-radius:7px;outline:none;font-family:'Consolas',monospace;font-size:12px;\">\n        <span>x</span>\n      </div>\n      <button class=\"main-btn place\" id=\"mainBtn\" onclick=\"onMainBtn()\">СДЕЛАТЬ СТАВКУ</button>\n      <div class=\"status-line\" id=\"statusLine\">Подключение...</div>\n    </div>\n\n    <div class=\"history\" id=\"history\"></div>\n    <div class=\"players-panel\" id=\"playersPanel\">\n      <div class=\"players-title\">ИГРОКИ В РАУНДЕ</div>\n      <div id=\"playersList\"><div class=\"empty-note\">Пока никто не поставил</div></div>\n    </div>\n  </div>\n\n  <!-- ============ FREE CRASH VIEW ============ -->\n  <div class=\"view\" id=\"viewFree\">\n    <div class=\"free-info\" id=\"freeInfo\">Ставка фиксирована: <b>100</b>. Один запуск в сутки, сброс в 00:00 по МСК.</div>\n    <div class=\"stage\" id=\"stageFree\">\n      <div class=\"grid-lines\"></div>\n      <div class=\"mult-display\" id=\"freeMultDisplay\">\n        <div class=\"mult-num\" id=\"freeMultNum\">1.00x</div>\n        <div class=\"mult-sub\" id=\"freeMultSub\">ГОТОВ К ЗАПУСКУ</div>\n      </div>\n      <div class=\"trail\" id=\"freeTrail\" style=\"height:0;\"></div>\n      <div class=\"rocket-wrap\" id=\"freeRocketLayer\" style=\"display:none;\">\n        <svg class=\"rocket-svg\" viewBox=\"0 0 60 140\">\n          <ellipse class=\"flame\" cx=\"30\" cy=\"112\" rx=\"9\" ry=\"26\" fill=\"url(#flameGrad)\"/>\n          <path d=\"M12 100 L-2 122 L12 114 Z\" fill=\"#ff6b35\"/>\n          <path d=\"M48 100 L62 122 L48 114 Z\" fill=\"#ff6b35\"/>\n          <path d=\"M30 2 C44 26 47 68 47 96 L13 96 C13 68 16 26 30 2 Z\" fill=\"url(#bodyGrad)\" stroke=\"#1c254f\" stroke-width=\"2\"/>\n          <circle cx=\"30\" cy=\"46\" r=\"9\" fill=\"#33f4e0\" stroke=\"#0d1330\" stroke-width=\"2.5\"/>\n        </svg>\n      </div>\n      <div class=\"boom\" id=\"freeBoom\">💥</div>\n      <div class=\"floater\" id=\"freeFloater\"></div>\n    </div>\n    <div class=\"controls\">\n      <button class=\"main-btn place\" id=\"freeBtn\" onclick=\"onFreeBtn()\">ИГРАТЬ (бесплатно)</button>\n      <div class=\"status-line\" id=\"freeStatusLine\">Проверка доступности...</div>\n    </div>\n  </div>\n\n</div>\n\n<script>\n// =====================================================================\n// AUTH\n// =====================================================================\nlet token = localStorage.getItem('crash_token');\nlet myUsername = localStorage.getItem('crash_username') || '';\nlet balance = 0;\nlet ws = null;\n\nfunction switchAuthTab(which){\n  document.getElementById('tabLogin').classList.toggle('active', which==='login');\n  document.getElementById('tabRegister').classList.toggle('active', which==='register');\n  document.getElementById('loginForm').style.display = which==='login' ? 'block' : 'none';\n  document.getElementById('registerForm').style.display = which==='register' ? 'block' : 'none';\n}\n\nasync function doLogin(){\n  const username = document.getElementById('loginUsername').value.trim();\n  const password = document.getElementById('loginPassword').value;\n  const errEl = document.getElementById('loginError');\n  errEl.textContent = '';\n  try{\n    const res = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, password})});\n    const data = await res.json();\n    if(!res.ok){ errEl.textContent = data.error || 'Ошибка входа'; return; }\n    token = data.token; myUsername = data.username; balance = data.balance;\n    localStorage.setItem('crash_token', token);\n    localStorage.setItem('crash_username', myUsername);\n    hideAuthModal();\n    connectWS();\n  }catch(e){ errEl.textContent = 'Не удалось связаться с сервером'; }\n}\n\nasync function doRegister(){\n  const username = document.getElementById('regUsername').value.trim();\n  const password = document.getElementById('regPassword').value;\n  const password2 = document.getElementById('regPassword2').value;\n  const errEl = document.getElementById('regError');\n  errEl.textContent = '';\n  if(password !== password2){ errEl.textContent = 'Пароли не совпадают'; return; }\n  try{\n    const res = await fetch('/api/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, password, confirmPassword: password2})});\n    const data = await res.json();\n    if(!res.ok){ errEl.textContent = data.error || 'Ошибка регистрации'; return; }\n    token = data.token; myUsername = data.username; balance = data.balance;\n    localStorage.setItem('crash_token', token);\n    localStorage.setItem('crash_username', myUsername);\n    hideAuthModal();\n    connectWS();\n  }catch(e){ errEl.textContent = 'Не удалось связаться с сервером'; }\n}\n\nfunction hideAuthModal(){ document.getElementById('authModal').style.display = 'none'; }\nfunction showAuthModal(){ document.getElementById('authModal').style.display = 'flex'; }\n\nfunction connectWS(){\n  const proto = location.protocol === 'https:' ? 'wss' : 'ws';\n  ws = new WebSocket(proto + '://' + location.host);\n  ws.onopen = () => { ws.send(JSON.stringify({type:'auth', token})); };\n  ws.onmessage = (ev) => { handleServerMessage(JSON.parse(ev.data)); };\n  ws.onclose = () => { setTimeout(()=>{ if(token) connectWS(); }, 1500); };\n}\n\nif(token){ hideAuthModal(); connectWS(); } else { showAuthModal(); }\n\n// =====================================================================\n// SHARED HELPERS\n// =====================================================================\nfunction fmt(n){ return Number(n).toFixed(2); }\nfunction updateBalanceDisplay(){\n  document.getElementById('balance').textContent = fmt(balance);\n  document.getElementById('userTag').textContent = myUsername;\n}\n\nfunction multClass(v){\n  if(v >= 100000) return 'rainbow';\n  if(v >= 1000) return 'white';\n  if(v >= 10) return 'super';\n  if(v >= 3) return 'high';\n  if(v >= 1.5) return 'mid';\n  return 'low';\n}\n\nfunction showFloaterEl(el, text, cls){\n  el.textContent = text;\n  el.className = 'floater ' + cls;\n  void el.offsetWidth;\n  el.classList.add('show');\n  setTimeout(()=>{ el.classList.remove('show'); }, 1800);\n}\n\nfunction buildStarsInto(stage){\n  let s = '';\n  for(let i=0;i<35;i++){\n    const top = Math.random()*100, left = Math.random()*100;\n    const delay = (Math.random()*2.6).toFixed(2);\n    const size = Math.random()<0.15 ? 3 : 2;\n    s += `<div class=\"star\" style=\"top:${top}%;left:${left}%;animation-delay:${delay}s;width:${size}px;height:${size}px;\"></div>`;\n  }\n  stage.insertAdjacentHTML('afterbegin', s);\n}\nbuildStarsInto(document.getElementById('stage'));\nbuildStarsInto(document.getElementById('stageFree'));\ndocument.getElementById('starsHolder').remove();\n\nfunction switchView(which){\n  document.getElementById('viewMain').classList.toggle('active', which==='main');\n  document.getElementById('viewFree').classList.toggle('active', which==='free');\n  document.getElementById('tabMainBtn').classList.toggle('active', which==='main');\n  document.getElementById('tabFreeBtn').classList.toggle('active', which==='free');\n}\n\n// =====================================================================\n// MAIN ROUND STATE\n// =====================================================================\nlet phase = 'waiting';\nlet myBetPlaced = false;\nlet myCashedOut = false;\nlet currentMultiplier = 1;\n\nconst betInput = document.getElementById('betInput');\nconst mainBtn = document.getElementById('mainBtn');\nconst statusLine = document.getElementById('statusLine');\nconst countdownWrap = document.getElementById('countdownWrap');\nconst countdownBar = document.getElementById('countdownBar');\nconst countdownTime = document.getElementById('countdownTime');\nconst multDisplay = document.getElementById('multDisplay');\nconst multNum = document.getElementById('multNum');\nconst multSub = document.getElementById('multSub');\nconst rocketLayer = document.getElementById('rocketLayer');\nconst trail = document.getElementById('trail');\nconst boom = document.getElementById('boom');\nconst floater = document.getElementById('floater');\nconst historyEl = document.getElementById('history');\nconst stage = document.getElementById('stage');\nconst playersList = document.getElementById('playersList');\n\nfunction setBet(delta){ let v = parseFloat(betInput.value)||0; v += delta; betInput.value = Math.max(1, Math.round(v)); }\nfunction halveBet(){ let v = parseFloat(betInput.value)||0; betInput.value = Math.max(1, Math.round(v/2)); }\nfunction setBetMax(){ betInput.value = Math.max(1, Math.floor(balance*100)/100); }\n\nfunction historyClass(v){ return multClass(v); }\nfunction renderHistory(history){\n  historyEl.innerHTML = history.slice(0,10).map(v => `<div class=\"hchip ${historyClass(v)}\">${v.toFixed(2)}x</div>`).join('');\n}\n\nfunction renderPlayers(bets){\n  if(!bets || bets.length===0){ playersList.innerHTML = '<div class=\"empty-note\">Пока никто не поставил</div>'; return; }\n  playersList.innerHTML = bets.map(b=>{\n    let multText, multClassName, extra;\n    if(b.status==='cashed'){ multClassName='cashed'; multText = fmt(b.mult)+'x'; extra = '+'+fmt(b.amount*b.mult); }\n    else if(b.status==='busted'){ multClassName='busted'; multText = fmt(b.mult)+'x'; extra = '-'+fmt(b.amount); }\n    else { multClassName = multClass(currentMultiplier); multText = fmt(currentMultiplier)+'x'; extra = fmt(b.amount*currentMultiplier); }\n    const nameSafe = b.username.replace(/</g,'&lt;');\n    return `<div class=\"player-row\"><span class=\"player-name\">${nameSafe}</span><span class=\"player-amount\">${fmt(b.amount)}</span><span class=\"player-mult ${multClassName}\">${multText} (${extra})</span></div>`;\n  }).join('');\n}\n\nfunction handleServerMessage(msg){\n  if(msg.type === 'error'){ statusLine.textContent = msg.error; return; }\n\n  if(msg.type === 'authed'){\n    myUsername = msg.username; balance = msg.balance;\n    localStorage.setItem('crash_username', myUsername);\n    updateBalanceDisplay();\n    return;\n  }\n  if(msg.type === 'balance'){ balance = msg.balance; updateBalanceDisplay(); return; }\n\n  if(msg.type === 'phase'){\n    phase = msg.phase;\n    if(phase === 'waiting'){\n      myBetPlaced = false; myCashedOut = false;\n      countdownWrap.style.display = 'block';\n      multDisplay.style.display = 'none';\n      rocketLayer.style.display = 'none';\n      rocketLayer.classList.remove('flying');\n      trail.style.height = '0px';\n      boom.classList.remove('show');\n      mainBtn.className = 'main-btn place';\n      mainBtn.textContent = 'СДЕЛАТЬ СТАВКУ';\n      mainBtn.disabled = false;\n      statusLine.textContent = 'Раунд начнётся скоро — успей поставить';\n    } else if(phase === 'running'){\n      countdownWrap.style.display = 'none';\n      multDisplay.style.display = 'block';\n      multNum.classList.remove('crashed');\n      multSub.textContent = 'ПОЛЁТ ИДЁТ';\n      rocketLayer.style.display = 'block';\n      rocketLayer.classList.add('flying');\n      if(myBetPlaced){\n        mainBtn.className = 'main-btn cashout';\n        mainBtn.disabled = false;\n      } else {\n        mainBtn.className = 'main-btn waitnext';\n        mainBtn.textContent = 'ОЖИДАНИЕ СЛЕДУЮЩЕГО РАУНДА';\n        mainBtn.disabled = true;\n        statusLine.textContent = 'В этом раунде ты не участвуешь';\n      }\n    }\n    return;\n  }\n\n  if(msg.type === 'tick'){\n    if(msg.phase === 'waiting' && typeof msg.countdownMs === 'number'){\n      const pct = (msg.countdownMs / 10000) * 100;\n      countdownBar.style.width = pct + '%';\n      countdownTime.textContent = (msg.countdownMs/1000).toFixed(1) + 's';\n    }\n    if(msg.phase === 'running' && typeof msg.multiplier === 'number'){\n      currentMultiplier = msg.multiplier;\n      multNum.textContent = fmt(currentMultiplier) + 'x';\n      multNum.className = 'mult-num ' + multClass(currentMultiplier);\n      const progress = Math.min(1, Math.log(currentMultiplier) / Math.log(20));\n      const riseVh = 8 + progress*60;\n      rocketLayer.style.bottom = riseVh + '%';\n      trail.style.height = (riseVh*0.85) + '%';\n      if(myBetPlaced && !myCashedOut){\n        const potential = betAmountLocal * currentMultiplier;\n        mainBtn.textContent = `ЗАБРАТЬ — ${fmt(potential)}`;\n        statusLine.textContent = `Ставка: ${fmt(betAmountLocal)} → сейчас получишь ${fmt(potential)}`;\n      }\n    }\n    if(msg.history) renderHistory(msg.history);\n    if(msg.bets) renderPlayers(msg.bets);\n    return;\n  }\n\n  if(msg.type === 'crash'){\n    rocketLayer.classList.remove('flying');\n    rocketLayer.style.display = 'none';\n    boom.style.bottom = rocketLayer.style.bottom || '10%';\n    boom.classList.add('show');\n    stage.classList.add('shake');\n    setTimeout(()=>stage.classList.remove('shake'), 400);\n    multNum.classList.add('crashed');\n    multSub.textContent = 'КРАХ!';\n    multNum.textContent = fmt(msg.crashPoint) + 'x';\n    renderHistory(msg.history);\n    renderPlayers(msg.bets);\n\n    if(myBetPlaced && !myCashedOut){\n      showFloaterEl(floater, `-${fmt(betAmountLocal)} БУСТ`, 'lose');\n      mainBtn.className = 'main-btn locked'; mainBtn.textContent = 'ПОТЕРЯНО'; mainBtn.disabled = true;\n      statusLine.textContent = `Ракета взорвалась на ${fmt(msg.crashPoint)}x`;\n    } else if(myBetPlaced && myCashedOut){\n      statusLine.textContent = `Ракета взорвалась на ${fmt(msg.crashPoint)}x — ты успел выйти`;\n    } else {\n      statusLine.textContent = `Ракета взорвалась на ${fmt(msg.crashPoint)}x`;\n    }\n    return;\n  }\n\n  if(msg.type === 'freecrash_status'){ updateFreeStatus(msg); return; }\n  if(msg.type === 'freecrash_started'){ freeRoundStart(msg.amount); return; }\n  if(msg.type === 'freecrash_tick'){ freeRoundTick(msg.multiplier); return; }\n  if(msg.type === 'freecrash_crash'){ freeRoundCrash(msg.crashPoint); return; }\n  if(msg.type === 'freecrash_result'){ freeRoundResult(msg.multiplier, msg.payout); return; }\n}\n\nlet betAmountLocal = 0;\n\nfunction onMainBtn(){\n  if(phase === 'waiting' && !myBetPlaced){\n    const amt = parseFloat(betInput.value);\n    if(!amt || amt <= 0){ statusLine.textContent = 'Введи сумму ставки больше нуля'; return; }\n    if(amt > balance){ statusLine.textContent = 'Недостаточно средств на балансе'; return; }\n    betAmountLocal = amt;\n    myBetPlaced = true;\n    ws.send(JSON.stringify({type:'bet', amount: amt}));\n    mainBtn.className = 'main-btn locked';\n    mainBtn.textContent = `СТАВКА ПРИНЯТА: ${fmt(amt)}`;\n    mainBtn.disabled = true;\n    statusLine.textContent = 'Жди старта — отменить ставку нельзя';\n    return;\n  }\n  if(phase === 'running' && myBetPlaced && !myCashedOut){\n    myCashedOut = true;\n    ws.send(JSON.stringify({type:'cashout'}));\n    const payout = betAmountLocal * currentMultiplier;\n    showFloaterEl(floater, `+${fmt(payout)} @ ${fmt(currentMultiplier)}x`, 'win');\n    mainBtn.className = 'main-btn locked';\n    mainBtn.textContent = `ЗАБРАЛ НА ${fmt(currentMultiplier)}x`;\n    mainBtn.disabled = true;\n    statusLine.textContent = `Выигрыш: +${fmt(payout - betAmountLocal)}`;\n  }\n}\n\n// =====================================================================\n// FREE DAILY CRASH\n// =====================================================================\nconst freeMultDisplay = document.getElementById('freeMultDisplay');\nconst freeMultNum = document.getElementById('freeMultNum');\nconst freeMultSub = document.getElementById('freeMultSub');\nconst freeRocketLayer = document.getElementById('freeRocketLayer');\nconst freeTrail = document.getElementById('freeTrail');\nconst freeBoom = document.getElementById('freeBoom');\nconst freeFloater = document.getElementById('freeFloater');\nconst freeBtn = document.getElementById('freeBtn');\nconst freeStatusLine = document.getElementById('freeStatusLine');\nconst stageFree = document.getElementById('stageFree');\n\nlet freeActive = false;\nlet freeMultiplier = 1;\nlet freeResetTimer = null;\n\nfunction updateFreeStatus(msg){\n  clearInterval(freeResetTimer);\n  if(msg.available){\n    freeBtn.disabled = false;\n    freeBtn.textContent = 'ИГРАТЬ (бесплатно)';\n    freeStatusLine.textContent = 'Доступно! Ставка 100, забери вовремя.';\n  } else if(msg.nextResetAt){\n    freeBtn.disabled = true;\n    freeBtn.textContent = 'УЖЕ ИСПОЛЬЗОВАНО СЕГОДНЯ';\n    const resetTs = new Date(msg.nextResetAt).getTime();\n    freeResetTimer = setInterval(()=>{\n      const remain = Math.max(0, resetTs - Date.now());\n      const h = Math.floor(remain/3600000), m = Math.floor((remain%3600000)/60000), s = Math.floor((remain%60000)/1000);\n      freeStatusLine.textContent = `Следующая попытка через ${h}ч ${m}м ${s}с`;\n      if(remain<=0){ clearInterval(freeResetTimer); ws.send(JSON.stringify({type:'freecrash_check'})); }\n    }, 1000);\n  } else {\n    freeBtn.disabled = true;\n    freeBtn.textContent = 'РАУНД ИДЁТ';\n    freeStatusLine.textContent = 'Раунд уже запущен...';\n  }\n}\n\nfunction onFreeBtn(){\n  if(freeBtn.disabled) return;\n  ws.send(JSON.stringify({type:'freecrash_start'}));\n}\n\nfunction freeRoundStart(amount){\n  freeActive = true;\n  freeMultiplier = 1;\n  freeMultSub.textContent = 'ПОЛЁТ ИДЁТ';\n  freeMultNum.classList.remove('crashed');\n  freeRocketLayer.style.display = 'block';\n  freeRocketLayer.classList.add('flying');\n  freeRocketLayer.style.bottom = '8%';\n  freeTrail.style.height = '0px';\n  freeBoom.classList.remove('show');\n  freeBtn.className = 'main-btn cashout';\n  freeBtn.disabled = false;\n  freeBtn.textContent = `ЗАБРАТЬ — ${fmt(amount)}`;\n  freeStatusLine.textContent = `Ставка: ${amount} → сейчас получишь ${fmt(amount)}`;\n}\n\nfunction freeRoundTick(mult){\n  freeMultiplier = mult;\n  freeMultNum.textContent = fmt(mult) + 'x';\n  freeMultNum.className = 'mult-num ' + multClass(mult);\n  const progress = Math.min(1, Math.log(mult) / Math.log(20));\n  const riseVh = 8 + progress*60;\n  freeRocketLayer.style.bottom = riseVh + '%';\n  freeTrail.style.height = (riseVh*0.85) + '%';\n  const potential = 100 * mult;\n  freeBtn.textContent = `ЗАБРАТЬ — ${fmt(potential)}`;\n  freeStatusLine.textContent = `Ставка: 100 → сейчас получишь ${fmt(potential)}`;\n}\n\nfunction freeRoundCrash(crashPoint){\n  freeActive = false;\n  freeRocketLayer.classList.remove('flying');\n  freeRocketLayer.style.display = 'none';\n  freeBoom.style.bottom = freeRocketLayer.style.bottom || '10%';\n  freeBoom.classList.add('show');\n  stageFree.classList.add('shake');\n  setTimeout(()=>stageFree.classList.remove('shake'), 400);\n  freeMultNum.classList.add('crashed');\n  freeMultNum.textContent = fmt(crashPoint) + 'x';\n  freeMultSub.textContent = 'КРАХ!';\n  showFloaterEl(freeFloater, `-100 БУСТ`, 'lose');\n  freeBtn.className = 'main-btn locked';\n  freeBtn.textContent = 'ПОТЕРЯНО';\n  freeStatusLine.textContent = `Ракета взорвалась на ${fmt(crashPoint)}x — бесплатная ставка сгорела`;\n}\n\nfunction freeRoundResult(mult, payout){\n  freeActive = false;\n  freeRocketLayer.classList.remove('flying');\n  freeRocketLayer.style.display = 'none';\n  showFloaterEl(freeFloater, `+${fmt(payout)} @ ${fmt(mult)}x`, 'win');\n  freeMultSub.textContent = 'ЗАБРАЛ';\n  freeBtn.className = 'main-btn locked';\n  freeBtn.textContent = `ЗАБРАЛ НА ${fmt(mult)}x`;\n  freeStatusLine.textContent = `Выигрыш: +${fmt(payout-100)}. Следующая попытка завтра.`;\n}\n</script>\n</body>\n</html>\n";

app.use(express.json());
app.get('/', (req, res) => { res.type('html').send(CLIENT_HTML); });

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ---------------------------------------------------------------------------
// PERSISTENCE (simple JSON file - see README for a Railway Volume note)
// ---------------------------------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_FILE = path.join(DATA_DIR, 'users.json');

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
function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

// token -> username key (in-memory only, lost on restart -> user just logs in again)
const sessions = {};

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
  const token = makeToken();
  sessions[token] = key;
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
  const token = makeToken();
  sessions[token] = key;
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
      const key = sessions[msg.token];
      if (key && users[key]) {
        authed = key;
        const user = users[key];
        sendTo(ws, { type: 'authed', username: user.username, balance: user.balance });
        sendTo(ws, { type: 'phase', phase, bettingEndTs, bettingMs: BETTING_MS });
        sendTo(ws, { type: 'tick', phase, multiplier: currentMultiplier, bets: betsList(), history });
        sendTo(ws, { type: 'freecrash_status', ...freeCrashStatus(user) });
      } else {
        sendTo(ws, { type: 'error', error: 'Сессия недействительна, войдите заново' });
      }
      return;
    }
    if (!authed) return;
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
