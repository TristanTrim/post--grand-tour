function TeaserOverlay(renderer, kwargs) {
  let canvas = renderer.gl.canvas;
  let width = canvas.clientWidth;
  let height = canvas.clientHeight;

  this.selectedClasses = new Set();
  this.renderer = renderer;


  utils.walkObject(kwargs, (k) => {
    this[k] = kwargs[k];
  });

  let that = this;
  let figure = d3.select('d-figure.'+renderer.gl.canvas.id);
  this.figure = figure;


  this.figure
  .on("mouseenter", ()=>{
      this.renderer.mouse_over_fig = true;
  })
  .on("mouseleave", ()=>{
      this.renderer.mouse_over_fig = false;
  })
  ;

  this.renderer.sel_mode = "";

  d3.select("body")
  .on("keydown", ()=>{
      if(this.renderer.mouse_over_fig){
          if (d3.event.key == "a")
              this.renderer.sel_mode = "add";
              this.selector.attr("stroke-opacity",1);
      }
  })
  .on("keyup", ()=>{
      if (d3.event.key == "a") {
          this.renderer.sel_mode = "";
          this.selector.attr("stroke-opacity",0);
          this.renderer.isPointSelected = this.renderer.isPointHighlighted.slice();
      }
  })
  .on('mousedown click',()=>{
    if(this.renderer.sel_mode == "add"){
      d3.event.preventDefault();
    }
  })
  ;


  this.getDataset = function(){
    return this.renderer.fixed_dataset || utils.getDataset();
  };




  this.epochSlider = figure
    .insert('input', ':first-child')
    .attr('type', 'range')
    .attr('class', 'slider epochSlider')
    .attr('min', renderer.epochs[0])
    .attr('max', renderer.epochs[renderer.epochs.length-1])
    .attr('value', renderer.epochIndex)
    .on('input', function() {
      let value = d3.select(this).property('value');
      renderer.shouldAutoNextEpoch = false;
      renderer.setEpochIndex(parseInt(value));
      // renderer.render(0);
      that.playButton.attr('class', 'tooltip play-button fa fa-play');
      that.playButton.select('span').text('Play training');
    });

  //special treatment when showing only one peoch
  if(renderer.epochs.length <= 1){
    this.epochSlider.style('display', 'none');
  }


  this.playButton = figure
    .insert('i', ':first-child')
    .attr('class', "play-button tooltip fa " + (renderer.shouldAutoNextEpoch?"fa-pause":"fa-play") )
    .on('mouseover', function() {
      d3.select(this).style('opacity', 1);
    })
    .on('mouseout', function() {
      d3.select(this).style('opacity', 0.7);
    })
    .on('click', function() {
      renderer.shouldAutoNextEpoch = !renderer.shouldAutoNextEpoch;
      if (renderer.shouldAutoNextEpoch) {
        d3.select(this).attr('class', 'tooltip play-button fa fa-pause');
        d3.select(this).select('span')
        .text('Pause training');
      } else {
        d3.select(this).attr('class', 'tooltip play-button fa fa-play');
        d3.select(this).select('span')
        .text('Play training');
      }
    });
  this.playButton.append('span')
  .attr('class', 'tooltipText')
  .text('Pause training');

  if(renderer.epochs.length <= 1){
    this.playButton.style('display', 'none');
  }


  this.fullScreenButton = figure
    .insert('i', ':first-child')
    .attr('class', 'tooltip teaser-fullscreenButton fas fa-expand-arrows-alt')
    .on('mouseover', function() {
      d3.select(this).style('opacity', 0.7);
    })
    .on('mouseout', function() {
      if(renderer.isFullScreen){
        d3.select(this).style('opacity', 0.7);
      }else{
        d3.select(this).style('opacity', 0.3);
      }
    })
    .on('click', function(){

      renderer.setFullScreen(!renderer.isFullScreen);
      // that.resize();

      if(renderer.isFullScreen){
        d3.select(this).style('opacity', 0.7);
      }else{
        d3.select(this).style('opacity', 0.3);
      }
    });

  this.fullScreenButton.append('span')
    .attr('class', 'tooltipTextBottom')
    .text('Toggle fullscreen');

  this.grandtourButton = figure
    .insert('i', ':first-child')
    .attr('class', 'teaser-grandtourButton tooltip fas fa-globe-americas')
    .attr('width', 32)
    .attr('height', 32)
    .style('opacity', renderer.shouldPlayGrandTour?0.7:0.3)
    .on('mouseover', function() {
      d3.select(this).style('opacity', 0.7);
    })
    .on('mouseout', function() {
      if (renderer.shouldPlayGrandTour) {
        d3.select(this).style('opacity', 0.7);
      }else{
        d3.select(this).style('opacity', 0.3);
      }
    });

  this.grandtourButton.append('span')
    .attr('class', 'tooltipText')
    .text('Play Grand Tour');

  this.grandtourButton
    .on('click', function() {
      renderer.shouldPlayGrandTour = !renderer.shouldPlayGrandTour;
      renderer.shouldCentralizeOrigin = renderer.shouldPlayGrandTour;

      renderer.isScaleInTransition = true;
      renderer.setScaleFactor(1.0);
      renderer.scaleTransitionProgress = 
        renderer.shouldCentralizeOrigin ? 
        Math.min(1,renderer.scaleTransitionProgress)
        :Math.max(0,renderer.scaleTransitionProgress);

      let dt = 0.03;
      renderer.scaleTransitionDelta = renderer.shouldCentralizeOrigin ? -dt:dt;

      if (renderer.shouldPlayGrandTour) {
        d3.select(this).select('span')
        .text('Pause Grand Tour');
        d3.select(this).style('opacity', 0.7);

      } else {
        d3.select(this).select('span')
        .text('Play Grand Tour');
        d3.select(this).style('opacity', 0.3);
      }
    });


  this.svg = figure
    .insert('svg', ':first-child')
    .attr('class', 'overlay')
    .attr('width', width)
    .attr('height', height)
    .attr('xmlns:xhtml', 'http://www.w3.org/1999/xhtml') //WALKER: this is required to make "foreignObjects" tags work
    .on('dblclick', function() {
      // renderer.shouldPlayGrandTour = !renderer.shouldPlayGrandTour;
    })
    .on('mousemove', ()=>{

      this.handleFigMove();

      //handle unsuccessful onscreen event
      if (renderer.shouldRender == false){
        renderer.shouldRender = true;
        if(renderer.animId === null){
          renderer.play();
        }
      }
    })
    ;


//---------------------------
//-- direct manip stuff -----
//---------------------------
// BONUS REWRITE!!!!!!!

    this.handleFigMove = function(){

      if ( this.renderer.sel_mode == "add" ){
        let x1 = d3.event.layerX;
        let y1 = d3.event.layerY;
        if (this.renderer.brush_start_pos) {
          let [x0,y0] = this.renderer.brush_start_pos;

          if (x0 > x1) [x0,x1] = [x1,x0];
          if (y0 > y1) [y0,y1] = [y1,y0];
          

        //  this.brushHandle.call(se1.overlay.brush.move,
        //        [[x0,y0],[x1,y1]]);
            this.selector
              .attr("x",x0)
              .attr("y",y0)
              .attr("width",x1-x0)
              .attr("height",y1-y0)
              ;

            let isPointBrushed = this.renderer.dataObj.points.map(d=>{
              let xInRange = x0<d[0] && d[0]<x1;
              let yInRange = y0<d[1] && d[1]<y1;
              return xInRange && yInRange;
            });
            this.renderer.isPointBrushed = isPointBrushed;

            let isHighlighted = numeric.bor(
                  this.renderer.isPointSelected,
                  this.renderer.isPointBrushed
            );
            this.renderer.isPointHighlighted = isHighlighted;

            this.renderer.dataObj.alphas = this.renderer.isPointHighlighted.map((brushy)=>brushy?255:32);


            this.renderer.hlPoints = this.renderer.dataObj.points.filter((d,i)=>this.renderer.isPointHighlighted[i]);

            if (this.renderer.hlPoints.length>0){
              let pointsMean = math.mean(this.renderer.hlPoints,0);
              this.centroidHandle
                .attr("cx",pointsMean[0])
                .attr("cy",pointsMean[1]);
            }

        } else {
          this.renderer.brush_start_pos = [x1,y1];
        }
      }else{
        this.renderer.brush_start_pos = undefined;
      }

    };

// Old~~~~~~~~~~~~~~~~~~~~~~~~~~~

  //developer options start =================
  let isDev = true;
  if (isDev){

    let devOptionsNode = document.createElement('div');
    figure.node().parentNode.insertBefore(devOptionsNode, figure.node().nextSibling);
    this.devOptions = d3.select(devOptionsNode);

    this.dmOption = this.devOptions.append('div')
    .attr('class', 'dmOption');
    this.dmOption.append('span')
    .text('Manipulation mode: ');

    this.dmRadioButtons = this.dmOption
    .selectAll('.dmOption_i')
    .data(['rotation', 'ortho_procrustes', 'proj_procrustes', 'PCA'])
    .enter()
    .append('input')
    .attr('class', 'dmOption_i')
    .attr('type', 'radio')
    .attr('name', 'dmMode-'+this.renderer.gl.canvas.id)
    .text(d=>d)
    .style('margin-left', '10px')
    .on('change', (d)=>{
      this.directManipulationMode = d;
    });
    this.dmRadioButtons.filter(d=>{
      d=='rotation'
    }).attr('checked', 'checked');

    this.dmOption
    .select('.dmOption_i')
    .attr('checked', 'checked');

    // dmRadioButtons labels
    this.dmRadioButtons
    .each(function(d){
      var t = document.createElement('label');
      this.parentNode.insertBefore(t, this.nextSibling);
      d3.select(t)
      .attr('class', 'dmOptionLabel_i')
      .text(d);   
    })
    .on('change', (d)=>{
      this.directManipulationMode = d;
    });
  }

  
  //developer options end =================


  this.directManipulationMode = 'rotation';

  //canvas scales, brush 
  //
  //
  this.updateScale = function(){
    let width = canvas.clientWidth;
    let height = canvas.clientHeight; 
    this.sx = d3.scaleLinear()
      .domain([-width/height, width/height])
      .range([renderer.marginLeft, width-renderer.marginRight]);
    this.sy = d3.scaleLinear()
      .domain([1,-1])
      .range([renderer.marginTop, height-renderer.marginBottom]);
   };
  this.updateScale();

  this.selector = this.svg.append('rect')
    .attr('stroke','white')
    .attr("fill-opacity",0)
    .attr("stroke-opacity",0)
    ;

//  this.brush = d3.brush();
//  this.brushHandle = this.svg.append('g') // I seriously have no idea why there's brush and brushHandle.
//    .attr('class', 'brush')
//    .call(this.brush);

  this.centroidHandle = this.svg
//    .selectAll('g.brush')
//    .selectAll('.centroidHandle')
//    .data([0])
//    .enter()
    .append('circle')
    .attr('class', 'centroidHandle')
    .attr('r', 20)
    .attr('fill', '#777')
    .attr('fill-opacity', 0.1)
    .attr('stroke', 'orange')
    .call(
      d3.drag() // DRAG
      .on('start', ()=>{
//        this.brush.hide();
        this.pcaIteration = 0;
        this.isViewManipulated = true;
        this.updateScale();

      })
      .on('drag', ()=>{ // ON DRAG

        // direct manipulation
        let [dx,dy] = [d3.event.dx, d3.event.dy];
        let [x,y] = [d3.event.x, d3.event.y];
        dx = this.sx.invert(dx)-this.sx.invert(0);
        dy = this.sy.invert(dy)-this.sy.invert(0);
        x = this.sx.invert(x);
        y = this.sy.invert(y);
        if(dx==0 && dy==0){
          return;
        }

        let dmax = this.renderer.dataObj.dmax;

        let selectedPoints = this.renderer.currentData
        .filter((d,i)=>{
          return this.renderer.isPointSelected[i];
        });

        if (selectedPoints.length>0){

          let centroid = math.mean(selectedPoints, 0);
          let norm = numeric.norm2(centroid);

          let isPointSelected = this.renderer.isPointSelected;

          let t, maxIter;
          if(selectedPoints[0].length > 15){
            t = 1.0;
            maxIter = 1;
          }else{
            t = 0.05;
            maxIter = 40;
          }

          if(this.pcaIteration < maxIter && this.directManipulationMode=='PCA'){
            let x2 = this.renderer.currentData;
            let x2Selected = x2.filter((d,i)=>{
              return isPointSelected[i];
            });
            x2Selected = numeric.dot(x2Selected, this.renderer.gt.matrix);

            let mean = math.mean(x2Selected, 0);
            let centrualized = x2Selected.map(row=>{
              return numeric.sub(row, mean);
            });

            let svd, v;

            if(x2Selected.length >= x2Selected[0].length ){
              svd = numeric.svd(centrualized);
              v = svd.V;
            } else {
              svd = numeric.svd(numeric.transpose(centrualized));
              v = svd.U;
              v = utils.embed(v, math.eye(v.length)._data);
              v = utils.orthogonalize(v);
            }
            
            v = numeric.transpose(v);
            for(let i=0; i<v.length; i++){
                if(v[i][i] < 0){
                  v[i] = numeric.mul(v[i], -1);
                }
            }
            v = numeric.transpose(v);
          
            let residual = math.sum(numeric.sub(v, math.eye(v.length)._data));
            if(Math.abs(residual)/v.length > 0.1 ){
              
              v = utils.mix(v, math.eye(v.length)._data, 1-t);
              v = utils.orthogonalize(v);
              let matrix = numeric.dot(
                 this.renderer.gt.getMatrix(), v
              );
              this.renderer.gt.setMatrix(matrix);
            }
            this.pcaIteration += 1;
          }



          if(this.directManipulationMode=='rotation' 
            || this.directManipulationMode=='PCA'){
            //// method 1
            //// planar rotation
            centroid = numeric.dot([centroid], this.renderer.gt.matrix)[0];
            let centroid2 = centroid.slice(); // shallow copy
            centroid2[0] += norm*dx;
            centroid2[1] += norm*dy;
            centroid = numeric.div(centroid, numeric.norm2(centroid));
            centroid2 = numeric.div(centroid2, numeric.norm2(centroid2));
            let basis = [centroid.slice(), centroid2.slice()];
            let cos = Math.min(1, numeric.dot(basis[0], basis[1]));
            let sin = Math.sqrt(1-cos*cos);
            for(let i=2; i<centroid.length; i++){
              let r = d3.range(centroid.length).map(j=>i==j?1:0);
              basis.push(r);
            }
            basis = utils.orthogonalize(basis);
            let rot = math.eye(centroid.length)._data;
            rot[0][0] = cos;
            rot[0][1] = sin;
            rot[1][0] = -sin;
            rot[1][1] = cos;
            let dmatrix = numeric.transpose(basis);
            dmatrix = numeric.dot(dmatrix, rot);
            dmatrix = numeric.dot(dmatrix, basis);
            this.renderer.gt.matrix = numeric.dot(
              this.renderer.gt.matrix,  dmatrix
            );

          }else{
            

            let x1 = this.renderer.currentData;
            x1 = numeric.dot(x1, this.renderer.gt.matrix);
            let x2 = x1.map((row, i)=>{
              row = row.slice();
              if(isPointSelected[i]){
                let l = numeric.norm2(row);
                row[0] += dx*l*1;
                row[1] += dy*l*1;
                // row[0] += dx;
                // row[1] += dy;
              }
              return row;
            });


            
            if(this.directManipulationMode=='ortho_procrustes'){

              //// method 2
              //// orthogonal procrustes
              let beta1 = 0.2;
              let beta0 = 1-beta1;

              // scale to control weights in procrustes
              x1 = utils.scaleRows(x1, isPointSelected, beta1, beta0);
              x2 = utils.scaleRows(x2, isPointSelected, beta1, beta0);
                
              let k = numeric.dot(numeric.transpose(x2), x1);
              let epsilon = numeric.diag(new Array(k.length).fill(1e-6));
              k = numeric.add(k, epsilon);

              let svd = numeric.svd(k);
              let u = svd.U;
              let v = svd.V;
              let ut = numeric.transpose(u);

              let dmatrix = numeric.dot(v, ut);


              this.renderer.gt.matrix = numeric.dot(
                this.renderer.gt.matrix,  dmatrix
              );

            }else if(this.directManipulationMode=='proj_procrustes'){
            
              //// method 3
              //// projection procrustes
              let beta1 = 0.6;
              let beta0 = 1-beta1;
              let projDim = 4;
              x2 = x2.map((row, i)=>{
                row = row.slice();
                for(let j=projDim; j<row.length; j++){
                  row[j] = 0;
                }
                return row;
              });

              // scale to control weights in procrustes
              x1 = utils.scaleRows(x1, isPointSelected, beta1, beta0);
              x2 = utils.scaleRows(x2, isPointSelected, beta1, beta0);

              let dmatrix;
              let diff = 1e9;
              for (let iter=0; iter<12; iter++){
                let k = numeric.dot(numeric.transpose(x2), x1);
                let svd = numeric.svd(k);
                let u = svd.U;
                let v = svd.V;
                dmatrix = numeric.dot(v, numeric.transpose(u));
                let x1rotated = numeric.dot(x1, dmatrix);

                diff = numeric.norm1(numeric.sub(
                    x1rotated.map(row=>row.slice(2)), 
                    x2.map(row=>row.slice(2))
                  ));
                // console.log(diff);
                if(diff < 1e-2){
                  break;
                }
                x2 = x2.map((row,i)=>{
                  for(let j=2; j<row.length; j++){
                    row[j] = x1rotated[i][j];
                  }
                  return row;
                });
              }
              // console.log('diff', diff);
              this.renderer.gt.matrix = numeric.dot(
                this.renderer.gt.matrix,  dmatrix
              );
            
            }else if(this.directManipulationMode=='PCA'){
              // let pcaDim = 2;
              // let beta1 = 1.0;
              // let beta0 = 1-beta1;
              // x2 = x2.map((row, i)=>row.slice(0, pcaDim));
              // // scale to control weights in procrustes
              // x1 = utils.scaleRows(x1, isPointSelected, beta1, beta0);
              // x2 = utils.scaleRows(x2, isPointSelected, beta1, beta0);
              // let k = numeric.dot(numeric.transpose(x2), x1);
              // let svd = numeric.svd(numeric.transpose(k));
              // let u = svd.U.map(r=>r.slice(0,pcaDim));
              // let v = svd.V;
              // let dmatrix2 = numeric.dot(u, numeric.transpose(v));
              // let matrix2 = numeric.dot(this.renderer.gt.matrix, dmatrix2);
              // for(let i=0; i<this.renderer.gt.matrix.length; i++){
              //   for(let j=0; j<pcaDim; j++){
              //     this.renderer.gt.matrix[i][j] = matrix2[i][j];
              //   }
              // }
              // this.renderer.gt.matrix = utils.orthogonalize(this.renderer.gt.matrix, 0);
              // 
              
            }
          }
          
          


        }

        this.renderer.selectedPoints = this.renderer.dataObj.points.filter((d,i)=>this.renderer.isPointSelected[i]);
        if (this.renderer.selectedPoints.length>0){
          let pointsMean = math.mean(this.renderer.selectedPoints,0);
          this.centroidHandle
            .attr("cx",pointsMean[0])
            .attr("cy",pointsMean[1]);
        }
      }) // end ON DRAG
      .on('end', ()=>{
      }) // end DRAG
    );

  this.centroidHandle.reposition = function(x,y){
    this.attr('cx', x)
      .attr('cy', y)
  };

    // end centroidHandle

  

//  this.brush.hide = ()=>{
//    this.svg.select('g.brush>.selection')
//    .style('fill-opacity', 0.01)
//    .style('stroke-opacity', 0.01);
//  };
//
//  this.brush.fade = ()=>{
//    this.svg.select('g.brush>.selection')
//    .style('fill-opacity', 0.01);
//  };
//
//  this.brush.show = ()=>{
//    this.svg.select('g.brush>.selection')
//    .style('fill-opacity', 0.3)
//    .style('stroke-opacity', null);
//
//  };
//
//  this.brush
//    .on('start', ()=>{
//      this.brush.show();
//      this.updateScale();
//    })
//    .on('brush', ()=>{
//      if(d3.event.selection){
//        this.shouldShowCentroid = true;
//
//        let [x0, y0] = d3.event.selection[0];
//        let [x1, y1] = d3.event.selection[1];
//        if ( y1 < y0){
//          console.log("Yikes. y1 was less than y0");
//          [y0,y1] = [y1,y0];
//        }
//        
//        this.centroidHandle.reposition((x0+x1)/2,(y0+y1)/2);
//        
//        let r = Math.min(Math.abs(x1-x0),Math.abs(y1-y0))/3;
//        r = Math.max(r, 12);
//        r = Math.min(r, 30);
//        this.centroidHandle.attr('r', r);
//
// //       x0 = this.sx.invert(x0);
// //       x1 = this.sx.invert(x1);
// //       y0 = this.sy.invert(y0);
// //       y1 = this.sy.invert(y1);
//
//        let isPointBrushed = this.renderer.dataObj.points.map(d=>{
//          let xInRange = x0<d[0] && d[0]<x1;
//          let yInRange = y0<d[1] && d[1]<y1;
//          return xInRange && yInRange;
//        });
//        this.renderer.isPointBrushed = isPointBrushed;
//
//        se1.dataObj.alphas = se1.isPointBrushed.map((brushy)=>brushy?255:32);
//
//      }
//    })
//    .on('end', ()=>{
//      this.brush.fade();
//      if(d3.event.selection 
//          && numeric.sum(this.renderer.isPointBrushed)>0 ){
//        // normal case: do nothing
//      }else{
//        let n = this.renderer.dataObj.npoint;
//        this.renderer.isPointBrushed = Array(n).fill(true);
//      }
//    });

//-----

  this.redrawCentroidHandle = function(){
    //draw brush centroid
    if(this.shouldShowCentroid){
      
      
      this.isPointSelected = this.renderer.isClassSelected.map((c,i)=>{
        return this.renderer.isPointBrushed[i] && this.renderer.isClassSelected[i];
      });

      let selectedPoints = this.renderer.pointsNormalized
        .filter((d,i)=>{
          return isPointSelected[i];
        });

      if (selectedPoints.length>0){
        let centroid = math.mean(selectedPoints, 0);
        let cx = this.sx(centroid[0]);
        let cy = this.sy(centroid[1]);
        this.centroidHandle.reposition(cx, cy);
      }else{
        this.centroidHandle.reposition(-999, -999);
      }
    }else{
      this.centroidHandle.reposition(-999, -999);
    }
  };

//---------------------------
//-- end direct manip stuff -
//---------------------------



  this.epochIndicator = this.svg.append('text')
    .attr('id', 'epochIndicator')
    .attr('text-anchor', 'middle')
    .text(`Epoch: ${renderer.epochIndex}/99`);
  
  
  this.controlOptionGroup = figure
    .insert('div', ':first-child');

  // this.datasetOption = this.controlOptionGroup
  //   .insert('div', ':first-child')
  //   .attr('class', 'form-group datasetOption');
  // this.datasetOption.append('label')
  //   .text('Dataset: ');
  // this.datasetSelection = this.datasetOption.append('select')
  //   .attr('class', 'datasetSelection')
  //   .on('change', function() {
  //     let dataset = d3.select(this).property('value');
  //     utils.setDataset(dataset)
  //   });
  // this.datasetSelection.selectAll('option')
  //   .data([
  //     {value:'mnist',text:'MNIST'}, 
  //     {value:'fashion-mnist',text:'fashion-MNIST'},
  //     {value:'cifar10',text:'CIFAR-10'}])
  //   .enter()
  //   .append('option')
  //   .text(d=>d.text)
  //   .attr('value', d=>d.value)
  //   .property('selected', d=>{
  //     //show default selection
  //       return d.value == this.getDataset();
  //   });
  //   
  this.zoomSliderDiv = this.controlOptionGroup
    .insert('div', ':first-child')
    .attr('class', 'form-group zoomSliderDiv');
  this.zoomLabel = this.zoomSliderDiv
    .append('label')
    .text('Zoom: ');
  this.zoomSlider = this.zoomLabel
    .append('input')
    .attr('type', 'range')
    .attr('class', 'slider zoomSlider')
    .attr('min', 0.5)
    .attr('max', 2.0)
    .attr('value', this.renderer.scaleFactor)
    .attr('step', 0.01)
    .on('input', function() {
      let value = +d3.select(this).property('value');
      renderer.setScaleFactor(value);
    });

  this.modeOption = this.controlOptionGroup
    .insert('div', ':first-child')
    .attr('class', 'form-group modeOption');
  this.modeLabel = this.modeOption.append('label')
    .text('Instances as: ');
  let select = this.modeLabel.append('select')
    .on('change', function() {
      let mode = d3.select(this).property('value');
      renderer.setMode(mode);
      that.updateArchorRadius(mode);
    });
  select.selectAll('option')
    .data(['point', 'image'])
    .enter()
    .append('option')
    .text((d)=>d)
    .attr('selected', d=>{
      return (d == this.renderer.mode) ? 'selected':null;
    });

  this.datasetOption = this.controlOptionGroup
    .insert('div', ':first-child')
    .attr('class', 'form-group datasetOption');
  this.datasetLabel = this.datasetOption
    .append('label')
    .text('Dataset: ');
  this.datasetSelection = this.datasetLabel
    .append('select')
    .on('change', function() {
      let dataset = d3.select(this).property('value');
      if (dataset == "__load_file__"){

  // ----- TODO: move this to utils --------------

        var input = $(document.createElement("input"));

        input.attr("type", "file");
        input.attr("multiple", true);

        input.on('change', function(){
              console.log(input);
              console.log(input[0].files);

              var fl1 = input[0].files[0];
              fl1.arrayBuffer().then((f)=>{
                    console.log(f);
                    // TODO: not this
                    se1.overlay.renderer.initData(f, fl1.name);
                    });

              var fl2 = input[0].files[1];
              if (fl2){
                fl2.arrayBuffer().then((f)=>{
                      console.log(f);
                      // TODO: not this
                      se1.overlay.renderer.initData(f, fl2.name);
                      });
              }

          });

        // add onchange handler if you wish to get the file :)
        input.trigger("click"); // opening dialog

 //--------------------------------------------------

      }else{
        utils.setDataset(dataset);
      }
    });
  this.datasetSelection.selectAll('option')
    .data([
      {value:'mnist',text:'MNIST'}, 
      {value:'fashion-mnist',text:'fashion-MNIST'},
      {value:'cifar10',text:'CIFAR-10'},
      {value:'test_img',text:'test-img'},
      {value:'b1_conv',text:'b1_conv'},
      {value:'__load_file__',text:'-- load file --'},
    ])
    .enter()
    .append('option')
    .text(d=>d.text)
    .attr('value', d=>d.value)
    .property('selected', d=>{
        return d.value == this.getDataset();
    });

  this.banner = figure.selectAll('.banner')
    .data([0])
    .enter()
    .append('div')
    .attr('class', 'banner')
  this.banner = figure.selectAll('.banner');
  this.bannerText = this.banner
    .selectAll('.bannerText')
    .data([0])
    .enter()
    .append('p')
    .attr('class', 'bannerText');
  this.bannerText = this.banner.selectAll('.bannerText');


  function clamp(min, max, v) {
    return Math.max(max, Math.min(min, v));
  }
  

  this.updateArchorRadius = function(mode) {
    if (mode == 'point') {
      this.archorRadius = clamp(7, 10, Math.min(width, height)/50);
    } else {
      this.archorRadius = clamp(7, 15, Math.min(width, height)/30);
    }
    this.svg.selectAll('.anchor')
      .attr('r', this.archorRadius);
  };


  this.resize = function() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    this.svg.attr('width', width);
    this.svg.attr('height', height);

    this.initLegendScale();
    this.updateArchorRadius(renderer.mode);
    this.repositionAll();
  };


  this.repositionAll = function() {
    let width = +this.svg.attr('width');
    let height = +this.svg.attr('height');

    let sliderLeft = parseFloat(this.epochSlider.style('left'));
    let sliderWidth = parseFloat(this.epochSlider.style('width'));
    let sliderMiddle = sliderLeft+sliderWidth/2;
    
    this.epochIndicator
      .attr('x', sliderMiddle)
      .attr('y', height-35);

    if(renderer.epochs.length <= 1){
      this.epochIndicator
        .attr('x', width/2-10)
        .attr('y', height-20);
    }

    let r = (this.legend_sy(1)-this.legend_sy(0))/4;
    this.legendMark
      .attr('cx', this.legend_sx(0.0)+2.5*r)
      .attr('cy', (c, i)=>this.legend_sy(i+0.5))
      .attr('r', r);

    this.legendText
      .attr('x', +this.legend_sx(0.0)+2.5*r+2.5*r)
      .attr('y', (l, i)=>this.legend_sy(i+0.7));

    //WALKER: declaring legend count
    this.legendCount
      .attr('x', +this.legend_sx(0.0)+2.5*r+8*r) //8 is a magic value for padding, dunno what it means
      .attr('y', (l, i)=>this.legend_sy(i+0.7));

    //WALKER: declaring filter
    this.confidenceFilter
      .attr('x', +this.legend_sx(0.0)+2.5*r-5)
      .attr('y', this.legend_sy(utils.getLabelNames().length+1)-this.legend_sy(-1));

    this.legendBox
      .attr('x', this.legend_sx.range()[0])
      .attr('y', this.legend_sy(-1))
      .attr('width', this.legend_sx.range()[1]-this.legend_sx.range()[0])
      .attr('height', this.legend_sy(utils.getLabelNames().length+1)-this.legend_sy(-7)) // WALKER: TODO: increase this later to allow room for more filter tools
      .attr('rx', r);

    if (this.legendTitle !== undefined){
      this.legendTitle
        .attr('x',  this.legend_sx(0.5))
        .attr('y',  this.legend_sy(-1))
        .text(utils.legendTitle[this.getDataset()] || '');

      let rectData = this.legendTitle.node().getBBox();
      let padding = 2;
      this.legendTitleBg
        .attr('x', rectData.x-padding)
        .attr('y', rectData.y-padding)
        .attr('width', rectData.width+2*padding)
        .attr('height', rectData.height+2*padding)
        .attr('opacity', utils.legendTitle[this.getDataset()]? 1:0);
    }
    if(this.banner){
      this.banner.remove();
    }
    
  }; // end repositionAll




  this.init = function() {
    this.initLegend(utils.baseColors.slice(0, 10), utils.getLabelNames(false, this.getDataset()));
    this.resize();
    this.initAxisHandle();
    if (this.annotate !== undefined){
      this.annotate(this.renderer);
    }
    // if(this.banner){
    //   this.banner.remove();
    // }
  };


  this.initAxisHandle = function() {
    this.svg.sc = d3.interpolateGreys;
    this.drawAxes();
  };


  this.drawAxes = function() {

    let svg = this.svg;
    let ndim = renderer.dataObj.ndim || 10;
    let coordinates = math.zeros(ndim, ndim)._data;

    console.log("annnnnddddd",ndim);

    svg.selectAll('.anchor')
      .data(coordinates)
      .enter()
      .append('circle')
      .attr('class', 'anchor')
      .attr('opacity', 0.2);

    let anchors = svg.selectAll('.anchor')
        .attr('cx', (d)=>renderer.sx(d[0]))
        .attr('cy', (d)=>renderer.sy(d[1]))
        .attr('r', this.archorRadius)
        .attr('fill', (_, i)=>d3.rgb(...utils.baseColors
                [i % utils.baseColors.length]).darker())
        .attr('stroke', (_, i)=>'white')
        .style('cursor', 'pointer');

    svg.anchors = anchors;

    svg.drag = d3.drag()
      .on('start', function() {
        renderer.shouldPlayGrandTourPrev = renderer.shouldPlayGrandTour;
        renderer.shouldPlayGrandTour = false;
        renderer.isDragging = true;
      })
      .on('drag', (d, i)=>{

        let dx = renderer.sx.invert(d3.event.dx)-renderer.sx.invert(0);
        let dy = renderer.sy.invert(d3.event.dy)-renderer.sy.invert(0);

        let sf = se1.scaleFactor;
        dx = sf*dx;
        dy = sf*dy;

        let x = renderer.sx.invert(d3.event.x);
        let y = renderer.sy.invert(d3.event.y);
        let matrix = renderer.gt.getMatrix();

//	console.log(matrix[i][0], matrix[i][1]); //Tristan: this is a neat object to explore.
	      //					Used in the wiggle functionality.

        matrix[i][0] += dx;
        matrix[i][1] += dy;
        // matrix[i][0] = x;
        // matrix[i][1] = y;
        matrix = utils.orthogonalize(matrix, i);
      
        renderer.gt.setMatrix(matrix);
        
        this.redrawAxis();
	//   console.log(this);
        // renderer.render(0);
      })
      .on('end', function() {
        renderer.isDragging = false;
        renderer.shouldPlayGrandTour = renderer.shouldPlayGrandTourPrev;
        renderer.shouldPlayGrandTourPrev = null;
      });

    anchors
      .on('mouseover', (_, i)=>{
        renderer.gt.STEPSIZE_PREV = renderer.gt.STEPSIZE;
        renderer.gt.STEPSIZE = renderer.gt.STEPSIZE * 0.2;
      })
      .on('mouseout', (_, i)=>{
        renderer.gt.STEPSIZE = renderer.gt.STEPSIZE_PREV;
        delete renderer.gt.STEPSIZE_PREV;
      })
      .call(svg.drag);
  };


  this.redrawAxis = function() {
    let svg = this.svg;

    if(renderer.gt !== undefined){
      let handlePos = renderer.gt.project(
            math.multiply(
              math.eye(renderer.dataObj.ndim), 
              //1/math.pow(se1.scaleFactor,1.1)
              1/se1.scaleFactor
              )._data);

      svg.selectAll('.anchor')
        .attr('cx', (_, i) => handlePos[i]===undefined ? undefined : renderer.sx(handlePos[i][0]) )
        .attr('cy', (_, i) => handlePos[i]===undefined ? undefined : renderer.sy(handlePos[i][1]) );
    }
    

    // svg.anchors.filter((_,j)=>renderer.gt.fixedAxes[j].isFixed)
    // .attr('fill', 'red')
    // .attr('opacity', 0.5);

    // svg.anchors.filter((_,j)=>!renderer.gt.fixedAxes[j].isFixed)
    // .attr('fill', 'black')
    // .attr('opacity', 0.1);
  };

  //WALKER: this is where the size of the legend box is created
  this.initLegendScale = function(){
    let width = +this.svg.attr('width');
    let marginTop = 20;
    let padding = 8;

    let legendLeft = width - utils.legendLeft[this.getDataset()]; //WALKER: could hardcode this if need be
    let legendRight = width - utils.legendRight[this.getDataset()];
    
    this.legend_sx = d3.scaleLinear()
      .domain([0, 1])
      .range([legendLeft, legendRight]);
    this.legend_sy = d3.scaleLinear()
      .domain([-1, 0, utils.getLabelNames().length, utils.getLabelNames().length+1])
      .range([marginTop-padding, marginTop, marginTop+170, marginTop+170+padding]);
  };

  //WALKER: this is where the legend is created
  this.initLegend = function(colors, labels) {
      
    this.initLegendScale();

    if(this.legendBox === undefined){
       this.legendBox = this.svg.selectAll('.legendBox')
        .data([0])
        .enter()
        .append('rect')
        .attr('class', 'legendBox')
        .attr('fill', d3.rgb(...utils.CLEAR_COLOR.map(d=>d*255)))
        .attr('stroke', '#c1c1c1')
        .attr('stroke-width', 1);
    }

    if (this.legendTitle === undefined 
      && utils.legendTitle[this.getDataset()] !== undefined){
       this.legendTitleBg = this.svg.selectAll('.legendTitleBg')
        .data([0, ])
        .enter()
        .append('rect')
        .attr('class', 'legendTitleBg')
        .attr('fill', d3.rgb(...utils.CLEAR_COLOR.map(d=>d*255)));

      this.legendTitle = this.svg.selectAll('.legendTitle')
        .data([utils.legendTitle[this.getDataset()], ])
        .enter()
        .append('text')
        .attr('class', 'legendTitle')
        .attr('alignment-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .text(d=>d);
    }

   


    this.svg.selectAll('.legendMark')
      .data(colors)
      .enter()
      .append('circle')
      .attr('class', 'legendMark')
      .attr('fill', (c, i)=>'rgb('+c+')')
      .on('mouseover', (_, i)=>{
        let classes = new Set(this.selectedClasses);
        if (!classes.has(i)) {
          classes.add(i);
        }
        this.onSelectLegend(classes);
      })
      .on('mouseout', ()=>this.restoreAlpha())
      .on('click', (_, i)=>{
        if (this.selectedClasses.has(i)) {
          this.selectedClasses.delete(i);
        } else {
          this.selectedClasses.add(i);
        }
        this.onSelectLegend(this.selectedClasses);
        if (this.selectedClasses.size == renderer.dataObj.ndim) {
          this.selectedClasses = new Set();
        }
      });
    this.legendMark = this.svg.selectAll('.legendMark');
    this.svg.selectAll('.legendText')
      .data(labels)
      .enter()
      .append('text')
      .attr('class', 'legendText');

    this.legendText = this.svg.selectAll('.legendText')
      .attr('alignment-baseline', 'middle')
      .attr('fill', '#333')
      .text((l)=>l)
      .on('mouseover', (_, i)=>{
        let classes = new Set(this.selectedClasses);
        if (!classes.has(i)) {
          classes.add(i);
        }
        this.onSelectLegend(classes);
      })
      .on('mouseout', ()=>this.restoreAlpha())
      .on('click', (_, i)=>{
        if (this.selectedClasses.has(i)) {
          this.selectedClasses.delete(i);
        } else {
          this.selectedClasses.add(i);
        }
        this.onSelectLegend(this.selectedClasses);
        if (this.selectedClasses.size == renderer.dataObj.ndim) {
          this.selectedClasses = new Set();
        }
      });

    //WALKER: text area that will contain amount of points visable
    this.svg.selectAll(".legendCount")
      .data(['100%', '90%', '80%', '70%', '60%', '50%', '40%', '30%', '20%', '10%']) //array of percentages/count will go here
      .enter() //dont really know what this is for but its needed
      .append('text')
      .attr('class', 'legendCount')
      //.attr('fill', '#333')
      .text("100%");

    this.legendCount = this.svg.selectAll('.legendCount');

    // WALKER: TODO: restrict input values to only digits
    this.confidenceFilter = this.svg.selectAll(".confidenceFilter")
      .data(['100'])
      .enter()
      .append('foreignObject')
      .attr('class', 'confidenceFilter')
      .attr('width', '100')
      .attr('height', '100');

    //min confidence
    this.confidenceFilter
      .append('xhtml:input')
      .attr('id', 'minConfidence')
      .attr('class', 'confidenceFilter')
      .attr('type', 'number')
      .attr('min', '0')
      .attr('max', '100')
      .attr('size', '3')
      .attr('value', '0')
      .attr('style', 'width: 35px; height: 20px; font-size: 10px; margin: 0; -webkit-appearance: none; -moz-appearance: textfield;'); //would love to put this in style.css but cant get it to work

    this.confidenceFilter
      .append('xhtml:text')
      .text('-');

    //max confidence
    this.confidenceFilter
      .append('xhtml:input')
      .attr('id', 'maxConfidence')
      .attr('class', 'confidenceFilter')
      .attr('type', 'number')
      .attr('min', '0')
      .attr('max', '100')
      .attr('size', '3')
      .attr('value', '100')
      .attr('style', 'width: 35px; height: 20px; font-size: 10px; -webkit-appearance: none; -moz-appearance: textfield;');//would love to put this in style.css but cant get it to work
      
    this.confidenceFilter
      .append('xhtml:text')
      .text('%');
    
    this.confidenceFilter
      .append('xhtml:input')
      .attr('type', 'button')
      .attr('value', 'apply')
      .attr('style', 'width: 80px; line-height: 15px; font-size: 10px;')
      .on('click', ()=>{

        this.applyFilter();
        
      });;

    this.confidenceFilter = this.svg.select('.confidenceFilter');
      
  };

  this.applyFilter = function(tempClasses=null) {
    // update percentages (mockup at the moment)
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    var percentagesOffset= [4, -1, 0, 2, -9, 11, 7, 3, -8, -1];
    var percentages = document.getElementsByClassName('legendCount');
    var min = parseFloat(document.getElementById('minConfidence').value);
    var max = parseFloat(document.getElementById('maxConfidence').value);
    var difference = max-min;
    difference = clamp(difference, 0, 100);
    for (var i = 0; i < percentages.length; i++) {
      if (difference == 0 || difference == 100) {
        percentages[i].innerHTML = clamp(difference , 0, 100) + '%';
      } else {
        percentages[i].innerHTML = clamp(difference + percentagesOffset[i], 0, 100) + '%';
      }
      
    }


    for (let i=0; i<renderer.dataObj.npoint; i++) {
      var digit = parseInt(renderer.dataObj.labels[i]); //already an int but parsing to make sure
      // confidence is initially between 0 and 1
      var confidenceAsPercent = renderer.dataObj.dataTensor[renderer.epochIndex][i][digit] * 100;
      // if the digit is not already filtered out
      // messy ass code. checks if the digit is either filters out by clicking a class or hovering over a class
      if (tempClasses != null){
        console.log("using tempclasses");
        console.log(min);
        console.log(max);
        
        if (tempClasses.has(digit) 
        && confidenceAsPercent >= min 
        && confidenceAsPercent <= max) {
          console.log("asdf");
          console.log(confidenceAsPercent);
          renderer.dataObj.alphas[i] = 255;
        }
      } else if ((this.selectedClasses.has(digit) || this.selectedClasses.size == 0)
        && confidenceAsPercent >= min 
        && confidenceAsPercent <= max){
        renderer.dataObj.alphas[i] = 255;
      } else {
        renderer.dataObj.alphas[i] = 0;
      }
      //renderer.dataObj.dataTensor[renderer.epochIndex][i];
    }
  };

  this.onSelectLegend = function(labelClasses) {
    if (typeof(labelClasses) === 'number') {
      labelClasses = [labelClasses];
    }
    labelClasses = new Set(labelClasses);

    for (let i=0; i<renderer.dataObj.npoint; i++) {
      if (labelClasses.has(renderer.dataObj.labels[i])) {
        renderer.dataObj.alphas[i] = 255;
      } else {
        renderer.dataObj.alphas[i] = 0;
      }
    }
    this.svg.selectAll('.legendMark')
      .attr('opacity', (d, j)=>{
        if (!labelClasses.has(j)) {
          return 0.1;
        } else {
          return 1.0;
        }
      });
    // renderer.render(0);
  };


  this.restoreAlpha = function() {
    let labelClasses = new Set(this.selectedClasses);
    if (labelClasses.size == 0) {
      for (let i=0; i<renderer.dataObj.npoint; i++) {
        renderer.dataObj.alphas[i] = 255;
      }
    } else {
      for (let i=0; i<renderer.dataObj.npoint; i++) {
        if (labelClasses.has(renderer.dataObj.labels[i])) {
          renderer.dataObj.alphas[i] = 255;
        } else {
          renderer.dataObj.alphas[i] = 0;
        }
      }
    }

    this.svg.selectAll('.legendMark')
      .attr('opacity', (d, i)=>{
        if (labelClasses.size == 0) {
          return 1.0;
        } else {
          return labelClasses.has(i) ? 1.0:0.1;
        }
      });
  
    this.applyFilter();
  };
}
