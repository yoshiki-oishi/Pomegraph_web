/* Excelのシリアル値とUNIXのエポック秒を相互に変換するための関数群 */
import {Chart} from "chart.js";

const COEFFICIENT = 24 * 60 * 60 * 1000; //日数とミリ秒を変換する係数

const DATES_OFFSET = 70 * 365 + 17 + 1 + 1; //「1900/1/0」～「1970/1/1」 (日数)
const MILLIS_DIFFERENCE = 9 * 60 * 60 * 1000; //UTCとJSTの時差 (ミリ秒)

//TODO この関数はリファクタリング対象。
export function drawBarChart(nodelink) {
    if (typeof chartPraph !== 'undefined' && chartPraph) {
        chartPraph.destroy();
    }
    const ctx = document.getElementById("graphCanvas").getContext("2d");

    // Aggregating dates
    // 日付だけの配列を生成。
    const dateArray = nodelink.dots.map(function (element) {
        return element.node.dstr;
    });
    // 重複した日付を1つにまとめる。
    const datemap = dateArray.filter(function (item, index) {
        return dateArray.indexOf(item) === index;
    });
    // 昇順でソート。
    const dategroupe = datemap.sort((a, b) => {
        return (new Date(a) - new Date(b))
    });

    // 最小と最大を取得するし、差分を計算。
    const days = nodelink.dots.reduce((result, cur) => {
        if (!(isNaN(cur.node['date']) || cur.node['date'] === 0)) result.push(cur.node['date']);
        return result;
    }, []);
    const [dmin, dmax] = (days.length) ? [Math.min(...days), Math.max(...days)] : [0, 10];// dafaulting.
    const dlen = dmax - dmin; //defaulting.

    // 最小値空最大値の間を1日ずつ埋める配列を生成する。
    let dateList = [];
    let startDate = dmin;
    for (let i = 0; i <= dlen; i++) {
        let nodeObj = (nodelink.dots.filter(
            x =>
                new Date(x.node.dstr).getFullYear() === new Date(convertSn2Ut(startDate)).getFullYear()
                && new Date(x.node.dstr).getMonth() === new Date(convertSn2Ut(startDate)).getMonth()
                && new Date(x.node.dstr).getDate() === new Date(convertSn2Ut(startDate)).getDate()
        ));
        let obj = {
            days: new Date(convertSn2Ut(startDate)),
            sum: nodeObj.length,
            node: nodeObj,
        }
        dateList.push(obj);
        startDate++;
    }

    // Assocを切り出す。
    const assocArray = nodelink.dots.map(function (element) {
        return element.node.association;
    });
    // 重複したAssocをまとめる。
    const assocArrayUnique = assocArray.filter(function (item, index) {
        return assocArray.indexOf(item) === index;
    });

    // Assoc毎に別の配列の入れる。
    let categorizedAttribute = [];
    for (let i = 0; i < assocArrayUnique.length; i++) {
        let nodeObject = nodelink.dots.filter(x => x.node.association === assocArrayUnique[i]);
        let object = {
            assoc: assocArrayUnique[i],
            color: nodeObject[0].color,
            node: nodeObject,
        };
        // console.log(object);
        categorizedAttribute.push(object);
    }

    // Assocで分類したノードをそれぞれ最小値空最大値の間を1日ずつ埋める配列を生成する。
    let graphOutPutNodeList = [];
    categorizedAttribute.forEach(element => {
        let dateListAssoc = [];
        let startDate = dmin;
        for (let i = 0; i <= dlen; i++) {
            let nodeObj = (element.node.filter(
                x =>
                    new Date(x.node.dstr).getFullYear() === new Date(convertSn2Ut(startDate)).getFullYear()
                    && new Date(x.node.dstr).getMonth() === new Date(convertSn2Ut(startDate)).getMonth()
                    && new Date(x.node.dstr).getDate() === new Date(convertSn2Ut(startDate)).getDate()
            ));
            let obj = {
                days: new Date(convertSn2Ut(startDate)),
                sum: nodeObj.length,
                node: nodeObj,
            }
            dateListAssoc.push(obj);
            startDate++;
        }
        graphOutPutNodeList.push(dateListAssoc);
    });
    // console.log(graphOutPutNodeList);
    let graphDate = dateList.map(e => {
        return `${(new Date(e.days)).getFullYear()}-${(new Date(e.days)).getMonth() + 1}-${(new Date(e.days)).getDate()}`;
    });
    let graphNum = dateList.map(e => {
        return e.sum;
    });
    // console.log(graphNum);
    let scaleMax = Math.max(...graphNum);
    let sumMax = 10;
    let outputData = graphOutPutNodeList.map(element => {
        let sumArray = [];
        let graphDate = element.map(e => {
            /* make sum array*/
            sumArray.push(e.sum);
        });
        let node = element.find(x => x.sum > 0);
        let color = node.node[0].color;
        let label = node.node[0].node.association;
        // console.log(sumArray);
        // console.log(color);
        // console.log(label);

        let data = {
            label: label,
            data: sumArray,
            backgroundColor: color,
            borderColor: '#4f4e4e',
            borderWidth: 0.5,
        }
        return data;
    });
    // console.log(outputData);
    let drawJson = JSON.stringify(outputData);
    // console.log(drawJson);

    window.chartPraph = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: graphDate,
            datasets: outputData,
        },
        options: {
            responsive: true,
            scales: {
                xAxes: [{
                    stacked: true, //積み上げ棒グラフにする設定
                }],
                yAxes: [{
                    stacked: true, //積み上げ棒グラフにする設定
                    ticks: {
                        min: 0,
                        max: scaleMax + 5,
                        stepSize: 5
                    }
                }]
            }
        }
    });
    let basegraph_canvas = document.getElementById("basegraph_cav");
    ctx.drawImage(basegraph_canvas,0,0);
}

export function makeLegendaryCanvas(legendary) {
    let $graphCanvasLegendary = document.getElementById("graphCanvasLegendary");
    let ctx = $graphCanvasLegendary.getContext("2d");
    const graphCanvas = document.getElementById("graphCanvas");
    let hight = graphCanvas.height;
    let width = graphCanvas.width;
    $graphCanvasLegendary.height = hight;
    $graphCanvasLegendary.width = width;
    let i = 0;
    legendary.forEach(obj => {
        let color = obj.color;
        ctx.beginPath();
        ctx.arc(30, i + 40, 40, 0, Math.PI * 2, true);
        ctx.fillStyle = color;
        ctx.fill();
        i = i + 1;
    });
}

export function convertUt2Sn(unixTimeMillis){ // UNIX時間(ミリ秒)→シリアル値
    return (unixTimeMillis + MILLIS_DIFFERENCE) / COEFFICIENT + DATES_OFFSET;
}

export function convertSn2Ut(serialNumber){ // シリアル値→UNIX時間(ミリ秒)
    return (serialNumber - DATES_OFFSET) * COEFFICIENT - MILLIS_DIFFERENCE;
}

export function dateFromSn(serialNumber){ // シリアル値→Date
    let date = new Date(convertSn2Ut(serialNumber));
    let day = date.getDate();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    return year + "/" + month + "/" + day;
}

export function dateToSn(date){ // Date→シリアル値
    return convertUt2Sn(date.getTime());
}