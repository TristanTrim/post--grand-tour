function TeaserRenderer(gl, program, kwargs) {
  this.gl = gl;
  this.program = program;
  this.id = gl.canvas.id;

  this.framesPerTransition = 30;
  this.framesPerEpoch = 60;
  this.scaleTransitionProgress = 0;

  utils.walkObject(kwargs, (k) => {
    this[k] = kwargs[k];
  });

  this.dataObj = {};
  this.ds_labels = [];
  this.ds_colors = [];

  this.mode = this.mode || 'point'; //default point mode, or overwritten by kwargs
  this.epochIndex = this.epochIndex || this.epochs[0];
  this.colorFactor = utils.COLOR_FACTOR;
  this.isFullScreen = false;
  if (this.shouldPlayGrandTour === undefined){
    this.shouldPlayGrandTour = false;
  }
  if (!this.hasOwnProperty('shouldAutoNextEpoch')){
    this.shouldAutoNextEpoch = true;
  }
  this.pointSize0 = this.pointSize || 2;

  // ----------------------------
  // ------ direct manip --------
  // ----------------------------

  this.marginLeft = 2;
  this.marginBottom = 80;
  this.marginTop = 2;
  this.marginRight = 80;

  // ----------------------------
  // -- end direct manip --------
  // ----------------------------

  this.clearLabels = function(){
    if( confirm("Clear labels? (unsaved permenantly lost!)")){
      this.dataObj.labels.fill(0);
      this.overlay.initLegend([[127,127,127]],['unclassed']);
      this.overlay.repositionAll();
    }
  };

  this.createLabel = function(labelMask){

    let new_label_index = this.ds_labels.length;

    let l, a, b, rgb;
    while (true){
   //   l = Math.random()*20+65;
   //   a = Math.random()*200-100;
   //   b = Math.random()*200-100;
   //   rgb = d3.lab(l,a,b).rgb();
      h = Math.random()*360;
      s = Math.random()*.3+.7;
      l = Math.random()*.3+.6;
      rgb = d3.hsl(h,s,l).rgb();
      if (
          0 < rgb.r && rgb.r < 256
       && 0 < rgb.g && rgb.g < 256
       && 0 < rgb.b && rgb.b < 256
       ) break;
    }

    rgb = ["r","g","b"].map((x)=>Math.floor(rgb[x]));
    this.ds_colors = this.ds_colors.concat([rgb]);
    this.ds_labels = this.ds_labels.concat(
            ["class"+(new_label_index+1)]);

    this.addToLabel(new_label_index, labelMask);
    this.overlay.initLegend();
  };

  this.addToLabel = function(label_index,labelMask){
    // defaults to current selection
    if (!labelMask){
        labelMask = this.isPointSelected;
    }
    // replaces points of labelMask with new label_index
    this.dataObj.labels = this.dataObj.labels.map((l,i)=>{
        if(labelMask[i]){
            return label_index;
        }else{
            return l;
        }
    });
  };

  this.overlay = new TeaserOverlay(this, this.overlayKwargs);


  this.sx_span = d3.scaleLinear();
  this.sy_span = d3.scaleLinear();
  this.sz_span = d3.scaleLinear();
  this.sx_center = d3.scaleLinear();
  this.sy_center = d3.scaleLinear();
  this.sz_center = d3.scaleLinear();
  this.sx = this.sx_center;
  this.sy = this.sy_center;
  this.scaleFactor = 1.0;

  this.xOffset = 0;
  this.yOffset = 0;

  this.setScaleFactor = function(s){
    this.scaleFactor = s;
  }



  this.initData = function(buffer, url) {
    console.log(url);
    console.log(buffer);

    if (
      this.dataObj._dataTensorLoaded
      && this.dataObj._labelsLoaded ) {
          this.dataObj._dataTensorLoaded = false;
          this.dataObj._labelsLoaded = false;
    }

    if (url.includes('labels')) {
      console.log("it's labels! : ) ");

      this.dataObj.labels = Array.from(new Int8Array(buffer));
      this.shouldRecalculateColorRect = true;

      this.dataObj._labelsLoaded = true;

    } else {
      let arr = new Float32Array(buffer);
      let nepoch; let npoint;

      format_match = url.match(/._([0-9]*)af_([0-9]*)dp_([0-9]*)dim_\./);
      if (format_match){
        nepoch = parseInt(format_match[1]);
        npoint = parseInt(format_match[2]);
        // TODO: make sure dim matches? probs not important.

      } else if (url.includes('test_img')
            || url.includes('b1_conv')
            ){
          nepoch = 1;
          npoint = 4096;
      } else {
          nepoch = 100;
          npoint = 1000;
      }

      if (this.epochIndex > nepoch-1){
        this.setEpochIndex(nepoch-1);
      }

      let ndim = arr.length/(nepoch*npoint);


      this.dataObj.dataTensor = utils.reshape(arr, [nepoch, npoint, ndim]);


      // ----------------------------
      // ------ direct manip --------
      // ----------------------------

      this.isPointBrushed = new Array(npoint).fill(false);
      this.isPointSelected = new Array(npoint).fill(false);
      this.isPointHighlighted = new Array(npoint).fill(false);
      this.isPointShown = new Array(npoint).fill(true);

      // ----------------------------
      // -- end direct manip --------
      // ----------------------------

      this.dataObj._dataTensorLoaded = true;

    }

    if (
        this.dataObj._dataTensorLoaded
        && this.dataObj._labelsLoaded
      ) {
        this.isDataReady = true;
        let dataTensor = this.dataObj.dataTensor;
        // this.dataObj.trajectoryLength = 5;
    //    this.dataObj.dmax = 1.05*math.max(math.abs(
    //      dataTensor[dataTensor.length-1]));
        this.dataObj.ndim = dataTensor[0][0].length;
        this.dataObj.npoint = dataTensor[0].length;
        this.dataObj.nepoch = dataTensor.length;
        if (this.dataObj.alphas === undefined) {
          // TODO: surely this should be just set to # npoint???
          this.dataObj.alphas = d3.range(
            this.dataObj.npoint + 5*this.dataObj.npoint).map((_) => 255);
        } else {
          this.overlay.restoreAlpha();
        }
        this.initGL(this.dataObj);
    }else{
        this.isDataReady = false;
    }

    

    if (this.isDataReady && this.isPlaying===undefined) {
      // renderer.isPlaying===undefined indicates the renderer on init
      // otherwise it is reloading other dataset
      this.isPlaying = true;
      this.play();
      this.overlay.init();
      
    }

    if(this.isDataReady 
      && (this.animId==null 
        || this.shouldRender==false)){
        this.shouldRender = true;
        // this.shouldRecalculateColorRect = true;
        this.play();
      }




  }; // end // initData


  this.setFullScreen = function(shouldSet) {
    this.isFullScreen = shouldSet;
    let canvas = this.gl.canvas;
    let canvasSelection = d3.select('#'+canvas.id);


    d3.select(canvas.parentNode)
      .classed('fullscreen', shouldSet);

    if (shouldSet) {
      canvasSelection
        .classed('fullscreen', true);
    } else {
      canvasSelection
        .classed('fullscreen', false);
    }

    utils.resizeCanvas(canvas);
    this.overlay.resize();
    gl.uniform1f(this.canvasWidthLoc, canvas.clientWidth);
    gl.uniform1f(this.canvasHeightLoc, canvas.clientHeight);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };


  this.setMode = function(mode='point') {
    this.mode = mode;
    if (mode === 'point') {
      gl.uniform1i(this.modeLoc, 0);
    } else if (mode === 'image') {
      gl.uniform1i(this.modeLoc, 1);
    }
  };


  this.initGL = function(dataObj) {
    let gl = this.gl;
    let program = this.program;
    // init
    utils.resizeCanvas(gl.canvas);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(...utils.CLEAR_COLOR, 0.0);

    // gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA
    );

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    this.colorBuffer = gl.createBuffer();
    this.colorLoc = gl.getAttribLocation(program, 'a_color');

    this.positionBuffer = gl.createBuffer();
    this.positionLoc = gl.getAttribLocation(program, 'a_position');

    this.textureCoordBuffer = gl.createBuffer();
    this.textureCoordLoc = gl.getAttribLocation(program, 'a_textureCoord');

    this.pointSizeLoc = gl.getUniformLocation(program, 'point_size');
    
    let textureCoords = [];
    for (let i=0; i<dataObj.npoint; i++) {
      textureCoords.push(...utils.getTextureCoord(i));
    }
    for (let i=0; i<dataObj.ndim*2; i++) {
      textureCoords.push([0, 0]);
    }

    if (this.textureCoordLoc !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoords), gl.STATIC_DRAW);
      gl.vertexAttribPointer(this.textureCoordLoc, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.textureCoordLoc);
    }
    
    let texture = utils.loadTexture(
      gl, utils.getTextureURL(this.overlay.getDataset()));
    this.samplerLoc = gl.getUniformLocation(program, 'uSampler');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.samplerLoc, 0);

    

    this.isDrawingAxisLoc = gl.getUniformLocation(program, 'isDrawingAxis');
    
    this.canvasWidthLoc = gl.getUniformLocation(program, 'canvasWidth');
    this.canvasHeightLoc = gl.getUniformLocation(program, 'canvasHeight');
    gl.uniform1f(this.canvasWidthLoc, gl.canvas.clientWidth);
    gl.uniform1f(this.canvasHeightLoc, gl.canvas.clientHeight);

    this.modeLoc = gl.getUniformLocation(program, 'mode');
    this.setMode(this.mode);

    this.colorFactorLoc = gl.getUniformLocation(program, 'colorFactor');
    this.setColorFactor(this.colorFactor);

    if (this.gt === undefined || this.gt.ndim != dataObj.ndim) {
      let gt = new GrandTour(dataObj.ndim, this.init_matrix);
      this.gt = gt;
    }
  };

  
  // this.shouldCentralizeOrigin = this.shouldPlayGrandTour;
  


  this.shouldRender = true;
  this.s = 0;

  this.play = (t=0)=>{
    let dt = 0;
    

    if (this.shouldRender 
      && (this.shouldPlayGrandTour || this.shouldAutoNextEpoch)) {
      
      if (this.shouldPlayGrandTour){
        dt = 1/60;
      }
    
      if (this.shouldAutoNextEpoch) {
        this.s += 1;
        if (this.s % this.framesPerEpoch == 0) {
          this.nextEpoch();
        }
      }else{
        this.setEpochIndex(this.epochIndex);
      }
    }

    if (this.isScaleInTransition 
      && this.scaleTransitionProgress<=1
      && this.scaleTransitionProgress>=0){
      this.scaleTransitionProgress += this.scaleTransitionDelta;
    }

    if (this.shouldRender) {
      this.render(dt);
      this.overlay.redrawAxis();
    }

    this.animId = requestAnimationFrame(this.play.bind(this));
  };


  this.setColorFactor = function(f) {
    this.colorFactor = f;
    this.gl.uniform1f(this.colorFactorLoc, f);
  };

  this.setPointSize = function(s) {
    this.pointSize = s;
    gl.uniform1f(this.pointSizeLoc, s * window.devicePixelRatio);
  };


  this.pause = function() {
    if(this.animId){
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.shouldRender = false;
    console.log('paused');
  };

  this.setEpochIndex = (i)=>{
    this.epochIndex = i;
    this.overlay.epochSlider
      .property('value', i);

    this.overlay.svg.select('#epochIndicator')
      .text(`Epoch: ${this.epochIndex}/${(this.dataObj.nepoch-1)}`);
  };

  this.playFromEpoch = function(epoch){
    this.shouldAutoNextEpoch = true;
    this.setEpochIndex(epoch);
    this.overlay.playButton.attr('class', 'tooltip play-button fa fa-pause');
  };

  this.nextEpoch = function() {
    if (this.epochs.length == 1){
      return;
    }

    if (this.epochIndex < this.epochs.length-1) {
      this.setEpochIndex( this.epochIndex+1 );
    } else {
      this.setEpochIndex( this.epochs[0] );
    }
  };


  this.prevEpoch = function() {
    if (this.epochs.length == 1){
      return;
    }

    if (this.epochIndex > 0) {
      this.setEpochIndex(this.epochIndex-1);
    } else {
      this.setEpochIndex(this.epochs.length-1);
    }
  };
  

  // start render fn ---------------------------
  this.render = function(dt) {
    if(this.dataObj.dataTensor === undefined){
      return;
    }
    
    let dataObj = this.dataObj;
    let data = this.dataObj.dataTensor[this.epochIndex];
    this.currentData = data; // used in direct manip
    let labels = this.dataObj.labels;
    let gl = this.gl;
    let gt = this.gt;
    let program = this.program;
    
    data = data.concat(utils.createAxisPoints(dataObj.ndim));
    let points = gt.project(data, dt);
    
    if (this.epochIndex > 0 
        && (this.s%this.framesPerEpoch)<this.framesPerTransition) {
      let data0 = this.dataObj.dataTensor[this.epochIndex-1];
      data0 = data0.concat(utils.createAxisPoints(dataObj.ndim));
      let points0 = gt.project(data0, dt/this.framesPerTransition);
      points = utils.linearInterpolate(
        points0, points, 
        (this.s%this.framesPerEpoch)/this.framesPerTransition);
    }


    utils.updateScale_center(points, gl.canvas,
      this.sx_center, this.sy_center, this.sz_center, 
      this.scaleFactor,
      utils.legendLeft[this.overlay.getDataset()]+15,
      65,
      undefined,
      undefined,
      this.xOffset,
      this.yOffset
    );
    
    utils.updateScale_span(points, gl.canvas,
      this.sx_span, this.sy_span, this.sz_span, 
      this.scaleFactor,
      utils.legendLeft[this.overlay.getDataset()]+15,
      65
    );

    let transition;
    if (this.scaleTransitionDelta > 0){
      transition = (t)=>Math.pow(t, 0.5);
    }else{
      transition = (t)=>1-Math.pow(1-t, 0.5);
    }
    this.sx = utils.mixScale(this.sx_center, this.sx_span, 
      this.scaleTransitionProgress, transition);
    this.sy = utils.mixScale(this.sy_center, this.sy_span, 
      this.scaleTransitionProgress, transition);
    this.sz = this.sz_center;

    points = utils.data2canvas(points, this.sx, this.sy, this.sz);

    if (this.mode == 'image') {
      points = utils.point2rect(points, 
        dataObj.npoint, 
        14*math.sqrt(this.scaleFactor)
      );
    }

    dataObj.points = points;

    // ----------------------------
    // ------ direct manip --------
    // ----------------------------


//    //noramlize points to webgl coordinate
//
//    pointsNormalized = points.slice();
//    dataObj.mean = math.mean(
//      pointsNormalized.map(row => {
//        return [row[0], row[1]];
//      }),
//    0);
//
//    dataObj.dmax = math.max(
//      pointsNormalized.map(row => {
//        return [
//          Math.abs(row[0]-dataObj.mean[0]), 
//          Math.abs(row[1]-dataObj.mean[1]), 
//        ];
//      })
//    );
//
//    this.pointsNormalized = pointsNormalized.map((row)=>{
//      row[0] -= dataObj.mean[0];
//      row[1] -= dataObj.mean[1];
//      return numeric.div(row, dataObj.dmax/(this.scaleFactor));
//    });  //used for brush


    // ----------------------------
    // -- end direct manip --------
    // ----------------------------

    let colors; let bgColors;
    if (this.ds_colors.length>0){
      colors = labels.map((d)=>this.ds_colors[d%this.ds_colors.length]);
      bgColors = labels.map((d)=>this.ds_colors[d%this.ds_colors.length]);
    }else{
      colors = labels.map((d)=>utils.baseColors[d%utils.baseColors.length]);
      bgColors = labels.map((d)=>utils.bgColors[d%utils.bgColors.length]);
    }

    //colors = colors.concat(utils.createAxisColors(dataObj.ndim));
    colors = colors.map((c, i)=>[c[0], c[1], c[2], dataObj.alphas[i]]);

    if (this.mode == 'image') {
      if(this.colorRect===undefined || this.shouldRecalculateColorRect){
        
        this.colorRect = utils.color2rect(colors, dataObj.npoint, dataObj.ndim);
        this.bgColorRect = utils.color2rect(bgColors, dataObj.npoint, dataObj.ndim);
        this.shouldRecalculateColorRect = false;
      }
      colors = this.colorRect;
      bgColors = this.bgColorRect;
    }
    dataObj.colors = colors;

    let colorBuffer = this.colorBuffer;
    let positionBuffer = this.positionBuffer;
    let colorLoc = this.colorLoc;
    let positionLoc = this.positionLoc;
    
    gl.viewport(0,0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(...utils.CLEAR_COLOR, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Uint8Array(flatten(colors)), gl.STATIC_DRAW);
    gl.vertexAttribPointer(colorLoc, 4, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.enableVertexAttribArray(colorLoc);
    
 //   let c0 = bgColors.map((c, i)=>[c[0], c[1], c[2], utils.pointAlpha]);
 //   gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(flatten(c0)), gl.STATIC_DRAW);

    let c1;
    if (this.mode === 'point') {
      gl.uniform1i(this.isDrawingAxisLoc, 0);
      this.setPointSize(this.pointSize0 * Math.sqrt(this.scaleFactor));

      gl.drawArrays(gl.POINTS, 0, dataObj.npoint);
      c1 = colors.map((c, i)=>[c[0], c[1], c[2], dataObj.alphas[i]]);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, dataObj.npoint*6);
      c1 = colors.map((c, i)=>[c[0], c[1], c[2],
                               dataObj.alphas[Math.floor(i/6)]]);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(flatten(c1)), gl.STATIC_DRAW);

    if (this.mode === 'point') {
      gl.uniform1i(this.isDrawingAxisLoc, 0);
      gl.drawArrays(gl.POINTS, 0, dataObj.npoint);

      gl.uniform1i(this.isDrawingAxisLoc, 1);
      gl.drawArrays(gl.LINES, dataObj.npoint, dataObj.ndim*2);
    } else {
      gl.uniform1i(this.isDrawingAxisLoc, 0);
      gl.drawArrays(gl.TRIANGLES, 0, dataObj.npoint*6);
      
      this.setMode('point');
      gl.uniform1i(this.isDrawingAxisLoc, 1);
      gl.drawArrays(gl.LINES, dataObj.npoint*6, dataObj.ndim*2);
      this.setMode('image');
    }
    return;
  }; // end render fn ----------------------

  this.dumpClassif = function(){
    d3.select("#textdump")
    .text(
        "colors, labels, classif = "
        + JSON.stringify( se1.ds_colors )
        + ",  "
        + JSON.stringify( se1.ds_labels )
        + ",  "
        + JSON.stringify( se1.dataObj.labels )
    )
    .transition()
    .style("opacity",1)
    ;
    setTimeout(()=>{
      d3.select("#textdump")
      .transition()
      //.ease(d3.easeQuadOut)
      .duration("10000")
      .style("opacity",0)
      .transition()
      .text("");
    }, 10000);
  }

  this.loadClassif = function(){
    let inp = prompt("paste:")
    if ( inp ){
      let [colors,labels,classif] = JSON.parse(inp);
      this.dataObj.labels = classif;
      this.overlay.initLegend(colors,labels);
      this.overlay.repositionAll();

    }
  };

}
