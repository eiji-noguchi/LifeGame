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
    var rep = new XMLHttpRequest();
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
    state.cells = [ny];
    for (var ix = 0; ix < nx; ix++) {
        state.cells[ix] = [ny];
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
state.setLife=function(ix,iy,life){
    if(life === 2){
        state.cells[ix][iy] ^= 1;
        state.tellCellChange(ix,iy,state.cells[ix][iy]);
    }else{
        if(state.cells[ix][iy] != life){
            state.cells[ix][iy] = life;
            state.tellCellChange(ix,iy,life);
        }
    }
    // 世代を0としコールバックする
    state.tellGenerationChange(state.generation=0);
}