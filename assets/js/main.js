/* --- ビューポート --- */
const viewport = {width: 0, height: 0, aspect: 2.0};
const margin = {top: 60, right: 60, bottom: 60, left: 60};

let viewportContainer, chartContainer, xAxisContainer, yAxisContainer, tooltipContainer, legendContainer;
let xAxisLabel, yAxisLabel;
let legendContent;

/* --- データセット --- */
let dataAll;

/* --- ステータス --- */
const dimensionObj = [
    { "label": "人気度", "value": "popularity" },
    { "label": "踊りやすさ", "value": "danceability" },
    { "label": "エネルギー", "value": "energy" },
    { "label": "曲の明るさ", "value": "valence" },
    { "label": "テンポ", "value": "tempo" },
    { "label": "アコースティック度", "value": "acousticness" },
    { "label": "インスト度", "value": "instrumentalness" },
    { "label": "ライブ感", "value": "liveness" },
    { "label": "スピーチ度", "value": "speechiness" },
    { "label": "ラウドネス", "value": "loudness" },
    { "label": "再生時間 (ms)", "value": "duration_ms" }
];

let selectedX = dimensionObj[1]["value"];
let selectedY = dimensionObj[0]["value"];

/*--- スケール ---*/
let xScale, yScale;
let colorScale = d3.scaleOrdinal();

/*--- 軸 ---*/
let xAxis, yAxis;

let getWindowSize = function() {
    console.log("getWindowSize");
    const container = $("#viewportContainer");
    viewport.width = container.width();
    viewport.height = Math.round(viewport.width / viewport.aspect);
    PubSub.publish('init:viewport');
};

let initViewport = function() {
    console.log("initViewport");

    // Clear previous SVG if any
    d3.select("#viewportContainer svg").remove();

    /*--- SVG作成 ---*/
    viewportContainer = d3.select("#viewportContainer")
        .append("svg")
        .attr("width", viewport.width)
        .attr("height", viewport.height)
        .attr("id", "svgArea")
        .attr("viewBox", "0 0 "+ viewport.width + " " + viewport.height)
        .attr("preserveAspectRatio", "xMidYMid");

    /*--- SVG内にグループ作成 ---*/
    chartContainer = viewportContainer.append("g").attr("id", "chartContainer");

    xAxisContainer = viewportContainer.append("g")
        .attr("id", "xAxisContainer")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (viewport.height - margin.bottom) + ")");

    yAxisContainer = viewportContainer.append("g")
        .attr("id", "yAxisContainer")
        .attr("class", "y axis")
        .attr("transform", "translate(" + margin.left + ",0)");

    xAxisLabel = viewportContainer.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", viewport.width / 2)
        .attr("y", viewport.height - 15);

    yAxisLabel = viewportContainer.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("x", -(viewport.height - margin.bottom) / 2)
        .attr("y", 22);

    tooltipContainer = d3.select("body").append("div")
        .attr("id", "tooltipContainer")
        .style("opacity", 0);

    legendContainer = viewportContainer.append("g")
        .attr("id", "legendContainer")
        .attr("transform", "translate(" + (margin.left + 30) + "," + (margin.top - 0) + ")");

    PubSub.publish('load:data');
};

let loadData = function() {
    console.log("loadData");

    Promise.all([
        d3.csv("assets/data/spotify_j-pop.csv"),
        d3.csv("assets/data/spotify_k-pop.csv"),
    ]).then(function (_data) {
        
        const jpopData = _data[0];
        const kpopData = _data[1];

        jpopData.forEach(d => d.genre = 'j-pop');
        kpopData.forEach(d => d.genre = 'k-pop');

        dataAll = jpopData.concat(kpopData);

        /*--- 列ごとにデータ型を整理 ---*/
        dataAll.forEach(function (d) {
            dimensionObj.forEach(dim => {
                if(d[dim.value]) d[dim.value] = +d[dim.value];
            });
        });

        console.log(dataAll);

        /*--- カラースケールを設定 ---*/
        colorScale.domain(['j-pop', 'k-pop']).range(["#e41a1c", "#377eb8"]);

        PubSub.publish('init:navi');
    }).catch(function(error){
        console.error("Error loading data:", error);
    });
};

let initNavi = function() {
    console.log("initNavi");

    const selectors = [
        {id: '#xVariableSelector', selected: selectedX },
        {id: '#yVariableSelector', selected: selectedY }
    ];

    selectors.forEach(sel => {
        const selectorMenu = d3.select(sel.id).select(".menu");
        selectorMenu.selectAll("div").remove(); // Clear old options

        selectorMenu.selectAll("div")
            .data(dimensionObj)
            .enter()
            .append("div")
            .attr("class", "item")
            .attr("data-value", d => d.value)
            .text(d => d.label);

        $(sel.id).dropdown({
            onChange: function(value, text, $selectedItem) {
                if (sel.id === '#xVariableSelector') selectedX = value;
                if (sel.id === '#yVariableSelector') selectedY = value;
                PubSub.publish('parse:data');
            }
        });
        $(sel.id).dropdown('set selected', sel.selected);
    });

    // Initial data parse call is handled by the last dropdown setting the value
};

let parseData = function() {
    console.log("parseData");

    /*--- スケールの更新 ---*/
    xScale = d3.scaleLinear()
        .domain(d3.extent(dataAll, d => d[selectedX])).nice()
        .range([margin.left, viewport.width - margin.right]);

    yScale = d3.scaleLinear()
        .domain(d3.extent(dataAll, d => d[selectedY])).nice()
        .range([viewport.height - margin.bottom, margin.top]);

    /*--- 軸の更新 ---*/
    xAxis = d3.axisBottom(xScale).ticks(10).tickSizeOuter(0);
    yAxis = d3.axisLeft(yScale).ticks(10).tickSizeOuter(0);

    xAxisContainer.transition().duration(1000).call(xAxis);
    yAxisContainer.transition().duration(1000).call(yAxis);

    /*--- 軸ラベルの更新 ---*/
    const xLabel = _.find(dimensionObj, { value: selectedX }).label;
    const yLabel = _.find(dimensionObj, { value: selectedY }).label;
    xAxisLabel.text(xLabel);
    yAxisLabel.text(yLabel);

    /*--- 凡例の描画 ---*/
    legendContainer.selectAll("*").remove();
    legendContent = d3.legendColor()
        .shape("circle")
        .shapePadding(20)
        .labelOffset(10)
        .orient('horizontal')
        .scale(colorScale);
        
    legendContainer.call(legendContent);

    PubSub.publish('draw:charts');
}

let drawCharts = function() {
    console.log("drawCharts");

    const circles = chartContainer.selectAll(".dot")
        .data(dataAll, d => d.track_id);

    circles.exit()
        .transition()
        .duration(1000)
        .attr("r", 0)
        .remove();

    circles.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("r", 0)
        .attr("cx", d => xScale(d[selectedX]))
        .attr("cy", d => yScale(d[selectedY]))
        .style("fill", d => colorScale(d.genre))
        .style("opacity", 0.7)
        .merge(circles)
        .transition()
        .duration(1000)
        .attr("cx", d => xScale(d[selectedX]))
        .attr("cy", d => yScale(d[selectedY]))
        .attr("r", 2.5);

    /*--- ツールチップを描画 ---*/
    d3.selectAll(".dot").on("mousemove", function(event) {
        const d = d3.select(this).datum();
        const xLabel = _.find(dimensionObj, { value: selectedX }).label;
        const yLabel = _.find(dimensionObj, { value: selectedY }).label;

        tooltipContainer.html(
            `曲名: <strong>${d.track_name}</strong><br>
            アーティスト: <strong>${d.artists}</strong><br>
            ジャンル: <strong>${d.genre.toUpperCase()}</strong><br>
            ${xLabel}: <strong>${d[selectedX]}</strong><br>
            ${yLabel}: <strong>${d[selectedY]}</strong>`
            )
            .style('top', (event.pageY - 12) + 'px')
            .style('left', (event.pageX + 25) + 'px')
            .style("opacity", 0.9);

    }).on("mouseout", function(_) {
        tooltipContainer.style("opacity", 0);
    });
};

PubSub.subscribe('init:windowsize', getWindowSize);
PubSub.subscribe('init:viewport', initViewport);
PubSub.subscribe('load:data', loadData);
PubSub.subscribe('init:navi', initNavi);
PubSub.subscribe('parse:data', parseData);
PubSub.subscribe('draw:charts', drawCharts);

PubSub.publish('init:windowsize');