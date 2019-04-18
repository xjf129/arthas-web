var ws;
var xterm;
var commandThreadStr = "thread  ";
var classloaderStr = "classloader  ";
var smStr = "sm  ";

$(function () {
    var url = window.location.href;
    var ip = getUrlParam('ip');
    var port = getUrlParam('port');

    if (ip != '' && ip != null) {
        $('#ip').val(ip);
    }
    if (port != '' && port != null) {
        $('#port').val(port);
    }

    //startConnect(true);

});

/** 获取参数 **/
function getUrlParam(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function getCharSize() {
    var tempDiv = $('<div />').attr({'role': 'listitem'});
    var tempSpan = $('<div />').html('qwertyuiopasdfghjklzxcvbnm');
    tempDiv.append(tempSpan);
    $("html body").append(tempDiv);
    var size = {
        width: tempSpan.outerWidth() / 26,
        height: tempSpan.outerHeight(),
        left: tempDiv.outerWidth() - tempSpan.outerWidth(),
        top: tempDiv.outerHeight() - tempSpan.outerHeight(),
    };
    tempDiv.remove();
    return size;
}

/** 获取窗口尺寸 **/
function getWindowSize() {
    var e = window;
    var a = 'inner';
    if (!('innerWidth' in window)) {
        a = 'client';
        e = document.documentElement || document.body;
    }
    var terminalDiv = document.getElementById("terminal-card");
    var terminalDivRect = terminalDiv.getBoundingClientRect();
    return {
        width: terminalDivRect.width,
        height: e[a + 'Height'] - terminalDivRect.top
    };
}

/** 命令行的尺寸 **/
function getTerminalSize() {
    var charSize = getCharSize();
    var windowSize = getWindowSize();
    console.log('charsize');
    console.log(charSize);
    console.log('windowSize');
    console.log(windowSize);
    return {
        cols: Math.floor((windowSize.width - charSize.left) / 10),
        rows: Math.floor((windowSize.height - charSize.top) / 17)
    };
}

/** 初始化 websocket **/
function initWs(ip, port) {
    var path = 'ws://' + ip + ':' + port + '/ws';
    ws = new WebSocket(path);
}

/** 初始化 xterm 命令行模拟器 **/
function initXterm(cols, rows) {
    xterm = new Terminal({
        cols: cols,
        rows: rows,
        screenReaderMode: true,
        rendererType: 'canvas',
        convertEol: true
    });
}

/** 开始连接arthas服务 **/
function startConnect(silent) {

    var ip = $('#ip').val();
    var port = $('#port').val();
    if (ip == '' || port == '') {
        tip("警告", "端口、IP不能为空");
        return;
    }
    if (ws != null) {
        tip("警告", "已经连接，请勿重复提交");
        return;
    }
    // init webSocket
    initWs(ip, port);
    ws.onerror = function () {
        ws = null;
        !silent && tip("警告", "连接失败");
    };
    ws.onopen = function () {
        console.log('open');
        $('#fullSc').show();
        var terminalSize = getTerminalSize()
        console.log('terminalSize')
        console.log(terminalSize)
        // init xterm
        initXterm(terminalSize.cols, terminalSize.rows)
        ws.onmessage = function (event) {

            if (event.type === 'message') {
                var data = event.data;
                xterm.write(data);
            }
        };
        xterm.open(document.getElementById('terminal'));
        xterm.on('data', function (data) {
            ws.send(JSON.stringify({action: 'read', data: data}))
        });
        ws.send(JSON.stringify({action: 'resize', cols: terminalSize.cols, rows: terminalSize.rows}));
        window.setInterval(function () {
            if (ws != null) {
                ws.send(JSON.stringify({action: 'read', data: ""}));
            }
        }, 30000);
    }
}

/**
 * 断开连接
 */
function disconnect() {
    try {
        ws.onmessage = null;
        ws.onclose = null;
        ws = null;
        xterm.destroy();
        $('#fullSc').hide();
        tip("警告", "成功断开连接");
    } catch (e) {
        alert('No connection, please start connect first.');
    }
}

/** 全屏幕展示 **/
function xtermFullScreen() {
    var ele = document.getElementById('terminal-card');
    requestFullScreen(ele);
}

/** 全屏幕展示 **/
function requestFullScreen(element) {
    var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;
    if (requestMethod) {
        requestMethod.call(element);
    } else if (typeof window.ActiveXObject !== "undefined") {
        var wscript = new ActiveXObject("WScript.Shell");
        if (wscript !== null) {
            wscript.SendKeys("{F11}");
        }
    }
}


/**
 * 执行命令
 */
function sendCommondtext() {

    //clearConmmond();
    if (ws == null) {
        tip("警告", "请先连接arthas服务");
        return;
    }
    var commond = $("#commond").val();
    if (commond == null || commond == "") {
        tip("警告", "命令不能为空");
        return;
    }
    ws.send(JSON.stringify({action: 'read', data: commond + "\r"}))
}

function tip(title, content) {
    layer.open({
        title: title
        , content: content
    });
}

/**
 * 执行命令
 */
function sendCommond(commond) {

    //clearConmmond();
    if (ws == null) {
        tip("警告", "请先连接arthas服务");
        return;
    }
    if (commond == null || commond == "") {
        tip("警告", "命令不能为空");
        return;
    }
    $("#commond").val(commond);

    ws.send(JSON.stringify({action: 'read', data: commond + "\r"}))
}

/**
 * 命令框回车事件
 */
function enter_btn(keycode) {
    if (keycode == 13) {
        sendCommondtext();
    }
    return;
}


function clearConmmond() {
    $("#commond").val("");
    ws.send(JSON.stringify({action: 'read', data: "cls \r"}))
    return;
}

/**
 * 左侧菜单点击事件
 * @param type
 * @param commondType
 */
function commondsClick(type, commondType) {

    var commandArray = {
        threads: {all: " ", block: " -b ", threadId: " ", threadN: " -n "},
        jvm: "jvm",
        dashboard: "dashboard",
        classloader: {tree: " -t", loadclass: " -c 类加载器ID --load 类名全路径"},
        sm: {methods: " ", methodInfo: " -d "}
    };

    var Command;
    // 线程
    if (type == 'thread') {
        threadCommand = commandArray.threads[commondType];
        if (commondType == "block" || commondType == "all") {
            $("#thread_ID_Div").addClass("layui-hide");
            $("#thread_NID_Div").addClass("layui-hide");
        } else if (commondType == "threadId") {
            $("#thread_ID_Div").removeClass("layui-hide");
            $("#thread_NID_Div").addClass("layui-hide");
        } else if (commondType == "threadN") {
            $("#thread_ID_Div").addClass("layui-hide");
            $("#thread_NID_Div").removeClass("layui-hide");
        }
        $("#commond").val(commandThreadStr + threadCommand);
    }

    // JVM内存
    if (type == 'jvm') {
        Command = commandArray[commondType];
        $("#commond").val(Command);

    }

    //系统数据面板
    if (type == "dashboard") {
        Command = commandArray[commondType];
        $("#commond").val(Command);
    }

    //类加载器
    if (type == "classloader") {
        Command = commandArray.classloader[commondType];
        $("#commond").val(classloaderStr + Command);
    }

    //查询类方法信息
    if (type == "sm") {
        Command = commandArray.sm[commondType];
        $("#commond").val(smStr + Command);
    }
}

function threadIDText() {
    $("#commond").val($("#commond").val() + $("#thread_ID_Text").val());
}

function threadNIDText() {
    $("#commond").val($("#commond").val() + $("#thread_NID_Text").val());
}