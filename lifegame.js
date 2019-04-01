"use strict";
// state,view,controlsの3つのからのオブジェクトの生成
var state = Object.create(null); //M:ライフゲームの状態を表すオブジェクト
var view = Object.create(null); //V:状態をグラフィックスで表示するオブジェクト
var controls = Object.create(null); //C:コントローラーオブジェクト

/**
 * JSONファイルを読み込み、ライフゲームを生成 
 */
window.onload = function () {
    readFile("./patterns.json", function (jsonObj, error) {
        if (error) {
            // ファイルが読み込めない場合はパターンメニューを作成しない
            delete controls.pattern;
        } else {
            state.patterns = jsonObj;
        }
        // body要素内にライフゲームの各パーツ(controls, view)を生成して配置する
        createLifeGame(document.body, 78, 60, 780, 600);
    });
}

/**
 * JSONファイルの読み込み
 * @param {OBJECT} filename JSONファイル
 * @param {function} callback jsonファイル読み込み成功時実行関数
 */
function readFile(filename, callback) {
    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState === 4) {
            if (req.status === 200) {
                callback(req.response, false);
            }
            else {
                callback(null, true)
            }
        }
    };
    req.open("GET", filename, true);
    req.responseType = "json";
    req.send(null)
}

/**
 * ライフゲームシミュレータを生成
 * @param {OBJECT} parent ライフゲームシミュレータの要素を挿入するオブジェクト
 * @param {number} nx 横の格子数
 * @param {number} ny 縦の格子数
 * @param {number} width canvas要素の幅
 * @param {number} height canvas要素の高さ
 */
function createLifeGame(parent, nx, ny, width, height) {
    // タイトル
    var title = elt("h1", { class: "title" }, "Life Game");
    // viewオブジェクトを生成する(戻り値はビューパネル)
    var viewpanel = view.create(nx, ny, width, height);
    // stateオブジェクトを初期化する
    state.create(nx, ny);
    // controlsオブジェクトをtoolbar要素から生成する
    var toolbar = elt("div", { class: "toolbar" });
    for (name in controls) {
        toolbar.appendChild(controls[name](state));
    }
    // toolbar要素とviewpanel要素を指定した要素(parent)の子要素として挿入する
    parent.appendChild(elt("div", null, title, toolbar, viewpanel));
}

/**
 * stateオブジェクトを定義する
 */
state.create = function (nx, ny) {
    // 格子サイズ
    state.nx = nx;
    state.ny = ny;
    // セルを表す2次元配列を生成し初期化
    state.cells = new Array(ny);
    for (var ix = 0; ix < nx; ix++) {
        state.cells[ix] = new Array(ny);
        for (var iy = 0; iy < ny; iy++) {
            // cells[ix][iy]が0のときは生物がいない、1のときは生物がいる
            state.cells[ix][iy] = 0;
        }
    }
    // checkviewイベントリスナの登録:viewからのイベントでセルを変更する
    document.addEventListener("clickview", function (e) {
        state.setLife(e.detail.ix, e.detail.iy, e.detail.life);
    }, false);
    // changeCellイベント,ChangeGenerationイベントのオブジェクトを生成
    state.changeCellEvent = document.createEvent("HTMLEvents");
    state.changeGenerationEvent = document.createEvent("HTMLEvents");
    // generation(世代数)を追加し、0に設定する
    state.generation = 0;
    state.tellGenerationChange(0);
    // アニメーションの状態を表す変数
    state.playing = false;
    state.timer = null;
};

/**
 * セル(ix,iy)の値が変更されたときに通知する
 */
state.tellCellChange = function (ix, iy, life) {
    state.changeCellEvent.initEvent("changecell", false, false);
    state.changeCellEvent.detail = { ix: ix, iy: iy, life: life };
    document.dispatchEvent(state.changeCellEvent);
};

/**
 * 世代数が変更されたときに呼ばれる
 */
state.tellGenerationChange = function (generation) {
    state.changeGenerationEvent.initEvent("changegeneration", false, false);
    state.changeGenerationEvent.detail = { generation: generation };
    document.dispatchEvent(state.changeGenerationEvent);
};

/**
 * セル(ix,iy)の周辺の生物の合計を求める
 */
state.getSumAround = function (ix, iy) {
    var dx = [0, 1, 1, 1, 0, -1, -1, -1];
    var dy = [1, 1, 0, -1, -1, -1, 0, 1];
    for (var k = 0, sum = 0; k < dx.length; k++) {
        if (state.cells[(ix + dx[k] + state.nx) % state.nx][(iy + dy[k] + state.ny) % state.ny]) {
            sum++;
        }
    }
    return sum;
};

/**
 * 次に世代に生物の状態をアップデート
 */
state.update = function () {
    // 状態を変えずに全セルをスキャンし、変更するセルをchangedCell配列に求める
    var changedCell = [];
    for (var ix = 0; iy < state.nx; ix++) {
        for (var iy = 0; iy < state.ny; iy++) {
            var sum = state.getSumAround(ix, iy);
            if (sum <= 1 || sum > 4) {
                // 死滅
                if (state.cells[ix][iy]) {
                    changedCell.push({ x: ix, y: iy });
                    // セルの変更をコールバック
                    state.tellCellChange(ix, iy, 0);
                }
            } else if (sum = 3) {
                // 誕生
                if (!state.cells[ix][iy]) {
                    changedCell.push({ x: ix, y: iy });
                    // セルの変更をコールバック
                    state.tellCellChange(ix, iy, 1);
                }
            }
        }
    }
    // 全セルスキャン後に、セルの変更を行う(排他的論理和により0->1,1->0とする)
    for (var i = 0; i < changedCell.length; i++) {
        state.cells[changedCell[i].x][changedCell[i].y] ^= 1;
    }
    // 世代を1つ増やし、それを通知する
    state.tellGenerationChange(state.generation++);
};

/**
 * セルの状態を設定
 * セル(ix,iy)に対してlifeが0のとき生物を死滅、1のとき生物を誕生、2のとき生物の生死を逆転させる
 */
state.setLife = function (ix, iy, life) {
    if (life === 2) {
        state.cells[ix][iy] ^= 1;
        state.tellCellChange(ix, iy, state.cells[ix][iy]);
    } else {
        if (state.cells[ix][iy] != life) {
            state.cells[ix][iy] = life;
            state.tellCellChange(ix, iy, life);
        }
    }
    // 世代を0としコールバックする
    state.tellGenerationChange(state.generation = 0);
}

/**
 * viewオブジェクトを定義
 */
view.create = function (nx, ny, width, height) {
    // レイヤーを表すcanvas要素を生成
    view.layer = [];
    // 生物表示用
    view.layer[0] = elt("canvas", { id: "rayer0", width: width, height: height });  // 生物を描画
    view.layer[1] = elt("canvas", { id: "rayer1", width: width, height: height });  // 格子線を描画
    // 格子サイズ、セルのサイズ、生物マーカーの半径を設定
    view.nx = nx;
    view.ny = ny;
    // セルの幅
    view.cellWidth = view.layer[0].width / nx;
    // セルの高さ
    view.cellHeight = view.layer[0].height.ny;
    // 生物を表す円の半径
    view.markRadius = (Math.min(view.cellWidth, view.cellHeight / 2.5 + 0.5)) | 0
    // canvasコンテキストを取得
    if (view.ctx) {
        delete view.ctx
    }
    view.ctx = [];
    for (var i = 0; i < view.layer.length; i++) {
        view.ctx.push(view.layer[i].getContext("2d"));
    }
    // 描画パラメータの初期設定
    view.backColor = "forestgreen"; // 背景色
    view.markColor = "white";       // 生物の色
    view.strokeStyle = "black";     // 格子線の色
    view.lineWidth = 0.2;           // 格子線の幅
    // 格子を描画する
    view.drawLattice();
    // 世代数を表示する要素の生成
    view.generation = elt("span", { id: "generation" });
    view.statuspanel = elt("div", { class: "status" }, "世代数:", view.generation);

    //clickviewイベント用のイベントオブジェクトを生成
    view.clickEvent = document.createEvent("HTMLEvents");
    // layer[1](格子)をクリックしたときのイベントリスナを登録
    view.layer[1].addEventListener("click", function (e) {
        // セルのx方向の番号
        var ix = Math.floor(e.offsetX / view.cellWidth);
        // セルのy方向の番号
        var iy = Math.floor(e.offsetY / view.cellWidth);
        // viewの(ix,iy)がクリックされたことをclickviewイベントで通知
        view.clickEvent.initEvent("clickview", false, false);
        view.clickEvent.detail = { ix: ix, iy: iy, life: 2 };
        document.dispatchEvent(view.clickEvent);
    }, false);
    // changeCellイベントリスナの登録:stateからのイベントでセルを再描画する
    document.addEventListener("changegeneration", function (e) {
        view.showGeneration(e.detail.generation);
    }, false);

    //viewpanel要素オブジェクトを返す
    return elt("div", { class: "viewpanel" }, view.layer[0], view.layer[1], view.statuspanel);
};

/**
 * 格子線を描画する
 */
view.drawLattice = function () {
    // 各レイヤーのCanvasをリセット
    for (var i = 0; i < view.layer.length; i++) {
        view.layer[i].width = view.layer[i].width
    }
    // layer[1]に格子を描く。講師はnxが150未満のときに描く
    if (view.nx < 150) {
        var c = view.ctx[1];
        c.lineWidth = view.lineWidth;
        c.strokeStyle = view.strokeStyle;
        for (var ix = 0; ix <= view.nx; ix++) {
            c.beginPath();
            c.moveTo(ix * view.cellWidth, 0);
            c.lineTo(ix * view.cellWidth, view.nx * view.cellHeight);
            c.stroke();
        }
        for (var iy = 0; iy <= view.ny; iy++) {
            c.beginPath();
            c.moveTo(0, iy * view.cellHeight);
            c.lineTo(view.nx * view.cellWidth, iy * view.cellHeight);
            c.stroke();
        }
    }
    // layer[0]を背景色で塗りつぶす
    c = view.ctx[0];
    c.fillStyle = view.backColor;
    c.fillRect(0, 0, view.layer[0].width, view.layer[0].height);
};

/**
 * セルに生物を描画する
 */
view.drawCell = function (ix, iy, life) {
    // 生物はlayer[0]に描画する
    var c = view.ctx[0];
    c.beginPath();
    if (life) {
        // 生物マークを描く
        var x = (ix + 0.5) * view.cellWidth;
        var y = (iy + 0.5) * view.cellHeight;
        var r = view.markRadius;
        c.fillStyle = view.markColor;
        c.arc(x, y, r, 0, Math.PI * 2, true);
        c.fill();
    } else {
        // セルを背景色で塗りつぶす
        var x = ix * view.cellWidth;
        var y = iy * view.cellHeight;
        c.fillStyle = view.backColor;
        c.fillRect(x, y, view.cellWidth, view.cellHeight);
    }
};

/**
 * 世代数の表示
 */
view.showGeneration = function (generation) {
    view.generation.innerHTML = generation;
}

/**
 * Contorolesオブジェクトを定義
 */
controls.play = function (state) {
    if (!state.timeInterval) {
        state.timeInterval = 300;
    }
    var input = elt("input", { type: "button", value: "連続再生" });
    input.addEventListener("click", function (e) {
        if (!state.playing) {
            state.timer = setInterval(state.update, state.timeInterval);
            state.playing = true;
        }
    });
    return input;
};

/**
 * 再生速度選択
 */
controls.changeTimeInterval = function (state) {
    var select = elt("select");
    var options = [
        { name: "超高速(20ms)", value: 20 },
        { name: "高速(100ms)", value: 100 },
        { name: "標準(300ms)", value: 300 },
        { name: "低速(600ms)", value: 600 },
    ];
    for (var i = 0; i < options.length; i++) {
        var option = elt("option", null, options[i].name);
        select.appendChild(option);
    }
    select.selectedIndex = 2;
    select.addEventListener("change", function (e) {
        SVGMetadataElement.timeInterval = options[select.selectedIndex].value;
        if (state.playing) {
            clearInterval(state.timer);
            state.timer = setInterval(state.update, state.timeInterval);
        }
    });
    return select
};

/**
 * 停止ボタン
 */
controls.stop = function (state) {
    var input = elt("input", { type: "button", value: "停止" });
    input.addEventListener("click", function (e) {
        if (state.playing) {
            clearInterval(state.timer);
            state.playing = false;
        }
    });
    return input;
};

/**
 * 次へボタン
 */
controls.step = function (state) {
    var input = elt("input", { type: "button", value: "次へ" });
    input.addEventListener("click", function (e) {
        clearInterval(state.timer);
        state.playing = false;
        state.update();
    });
    return input;
};

/**
 * パターン選択
 */
controls.pattern = function (state) {
    var select = elt("select");
    select.appendChild(elt("option", null, "パターン選択"));
    for (var i = 0; i < state.patterns.length; i++) {
        select.appendChild(elt("option", null, state.patterns[i].name));
    }
    select.selectedIndex = 0;
    select.addEventListener("change", function (e) {
        clearInterval(state.timer);
        state.playing = false;
        if (select.selectedIndex != 0) {
            placePatttern(state.patterns[select.selectedIndex - 1]);
        }
        select.selectedIndex = 0;
    });
    return select;
    function placePatttern(pattern) {
        var array = pattern.points;
        // x,yの最小値と最大値を求める
        var max = [0, 0];
        var min = [state.nx - 1, state.ny - 1];
        for (var i = 0; i < array.length; i++) {
            for (var d = 0; d < 2; d++) {
                if (array[i][d] > max[d]) {
                    max[d] = array[i][d];
                }
                if(array[i][d]<min[d]){
                    min[d]=array[i][d];
                }
            }
        }
        // 全セルを削除
        state.clearAllCell();
        // Canvasの中心にパターンを配置
        for(var i=0; i<array.length; i++){
            var ix = array[i][0]+Math.floor((state.nx-min[0]-max[0])/2);
            var iy = array[i][1]+Math.floor((state.ny-min[1]-max[1])/2);
            state.setLife(ix,iy,1);
        }
        state.tellGenerationChange(state.generation=0);
    }
};

/**
 * 消去ボタン
 */
controls.clear = function(state){
    var input = elt("input",{type:"button",value:"全消去"});
    input.addEventListener("clicl",function(e){
        clearInterval(state.timer);
        state.playing=false;
    });
    return input;
}