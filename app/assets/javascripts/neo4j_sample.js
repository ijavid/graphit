
var Drawing = Drawing || {};

Drawing.Neo4jGraph = function(options) {
  var options = options || {}
  
  var camera, scene, renderer, interaction, stats;
  var graph = new Graph({limit: options.limit});
  var graph_layout;

  var neo4j_host = "http://localhost:7474";
  var neo4j_root = "/db/data/node/" + (options.node_id || 0);
  var node_queue = [];
  var finished = true;
  
  var geometries = [];
  var info;

  init();
  createGraph();
  animate();

  function init() {
    // Three.js initialization
    // camera = new THREE.Camera( 75, window.innerWidth / window.innerHeight, 1, 1000000 );
    camera = new THREE.TrackballCamera({

    					fov: 40, 
    					aspect: window.innerWidth / window.innerHeight,
    					near: 1,
    					far: 1e5, //1e3,

    					rotateSpeed: 1.0,
    					zoomSpeed: 1.2,
    					panSpeed: 0.8,

    					noZoom: false,
    					noPan: false,

    					staticMoving: false,
    					dynamicDampingFactor: 0.3,

    					keys: [ 65, 83, 68 ]

    				});


    camera.position.z = 5000;
    // camera.useTarget = false;

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize( window.innerWidth, window.innerHeight );
  
  
    var object = new THREE.Trident();
    				object.position.x = 0;
    				object.position.z = 0;
    				object.scale.x = object.scale.y = object.scale.z = 5;
    				scene.addObject( object );  

    // interaction = new THREEJS.Interaction(camera);

    document.body.appendChild( renderer.domElement );
  
    // Stats.js
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '51px';
    document.body.appendChild( stats.domElement );
    
    info = document.createElement("div");
    info.style.position = 'absolute';
    info.style.top = '100px';
    document.body.appendChild( info );    
  }


  function createGraph() {
    $.getJSON(neo4j_host + neo4j_root, function(db_node) {

      var node_id = getNodeId(db_node);
      var client_node = new Node(node_id);

      var created_node = graph.addNode(client_node);
      if(created_node) {
        drawNode(client_node);
      } else {
        client_node = graph.getNode(node_id);
      }
  
      $.getJSON(db_node.outgoing_relationships, function(relationships) {
        relationships.forEach(function(relationship) {
          $.getJSON(relationship.end, function(relationship_node) {
            if(graph.reached_limit()) {
              return;
            }
            // server_node.self is an url, so split by '/'
            var node_parts = relationship_node.self.split("/");
            // last entry is the node id
            var node_id = node_parts[node_parts.length-1];
            var client_node1 = new Node(node_id);
    
            if(graph.addNode(client_node1)) {
              drawNode(client_node1);
              node_queue.push(relationship_node);
              finished = false;
            }
    
            if(graph.addEdge(client_node, client_node1)) {
              drawEdge(client_node, client_node1);
            }
          });
        });
      });
    });
  
    graph.layout = new Layout.ForceDirected(graph, {width: 2000, height: 2000, iterations: 500});
  }


  function getNodes() {
    if(graph.reached_limit()) {
      finished = true;
      return false;
    }
  
    // db_node = JSON-Object from Neo4j
    var db_node = node_queue.shift(); // get first node and remove from queue
    if(db_node != undefined) {
      // relationships = Array with all Relationships from Neo4J
      $.getJSON( db_node.outgoing_relationships, function(relationships) {

        // relationship = JSON-Object with relationship
        relationships.forEach(function(relationship) {
          if(graph.reached_limit())
            return;

          var rel_type = relationship.type;
          $.getJSON(relationship.end, function(relationship_node) {
            if(graph.reached_limit())
              return;
          
            finished = false;


            var node_id = getNodeId(relationship_node);
            var client_node = new Node(node_id);

            var created_node = graph.addNode(client_node);
            if(created_node) {
              drawNode(client_node);
            } else {
              client_node = graph.getNode(node_id);
            }
          
            //if(relationship_node.id == 2)
             // alert(graph.created_node);

          
             if(created_node) {
               if(graph.addEdge(graph.getNode(getNodeId(db_node)), client_node, rel_type)) {
                 drawEdge(graph.getNode(getNodeId(db_node)), client_node, rel_type);
               }
             } else {
               if( !client_node.connectedTo( graph.getNode(getNodeId(db_node)) ) ) {
                 //if(relationship_node.id == 2)
                   //alert(client_node1.connectedTo( graph.getNode(server_node.id) ));
                 if(graph.addEdge(graph.getNode(getNodeId(db_node)), client_node, rel_type)) {
                   drawEdge(graph.getNode(getNodeId(db_node)), client_node, rel_type);
                 }
               }
             }
             graph.layout.init();
             node_queue.push(relationship_node);
          });
        });
      });
    } else {
      finished = true;
    }
    return true;
  }


  function getNodeId(db_node) {
    var node_parts = db_node.self.split("/");
    return node_parts[node_parts.length-1];
  }



  function drawNode(node) {

    var geometry = new THREE.CubeGeometry( 100, 100, 0 );
    var draw_object = new THREE.Mesh( geometry, [ new THREE.MeshBasicMaterial( {  color: Math.random() * 0xffffff, opacity: 0.5 } ), new THREE.MeshBasicMaterial( { color: 0xffffff, opacity: 0.5, wireframe: true } ) ] );

    // label
    // var labelCanvas = document.createElement( "canvas" );
    // var xc = labelCanvas.getContext("2d");
    // labelCanvas.width = labelCanvas.height = 128;
    // // xc.shadowColor = "#000";
    // // xc.shadowBlur = 7;
    // // xc.fillStyle = "orange";
    // xc.font = "50pt arial bold";
    // xc.fillText("myText", 10, 64);
    // 
    // var xm = new THREE.MeshBasicMaterial( { map: new THREE.Texture( labelCanvas ), transparent: true } );
    // xm.map.needsUpdate = true;


    var area = 5000;
    if(node.id == 0) {
      draw_object.position.x = 0;
      draw_object.position.y = 0;
      // draw_object.position.z = 0;
    } else {
      draw_object.position.x = Math.floor(Math.random() * (area + area + 1) - area);
      draw_object.position.y = Math.floor(Math.random() * (area + area + 1) - area);
      // draw_object.position.z = Math.floor(Math.random() * (area + area + 1) - area);
    }

    // var mesh = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100 ), xm );
    // mesh.position.x = draw_object.position.x;
    // mesh.position.y = draw_object.position.y;
    // mesh.doubleSided = true;
    // mesh.draw_object = draw_object;
    // mesh.updateMatrix();
    // mesh.type = "label";
    // scene.addObject(mesh);


    draw_object.id = node.id;
    node.data.draw_object = draw_object;
    node.position = draw_object.position;
    node.rotation = draw_object.rotation;
    scene.addObject( node.data.draw_object );
  }




  function drawEdge(source, target, type) {
    var color = 0xff0000;
    if(type == "dislikes") {
      color = 0x00ff00;
    }
    material = new THREE.LineBasicMaterial( { color: color, opacity: 1, linewidth: 1 } );
    tmp_geo = new THREE.Geometry();

    tmp_geo.vertices.push(new THREE.Vertex(source.data.draw_object.position));
    tmp_geo.vertices.push(new THREE.Vertex(target.data.draw_object.position));

    geometries.push(tmp_geo);

    line = new THREE.Line( tmp_geo, material, THREE.LinePieces );
    line.scale.x = line.scale.y = line.scale.z = 1;
    line.originalScale = 1;
    scene.addObject( line );
  }


  function animate() {
    requestAnimationFrame( animate );
    render();
  }


  function render() {
    getNodes();

    if(graph.layout.generate()) {
      graph.layout.init();
      info.style.border = '10px solid red';
    } else {
      info.style.border = 'none';
    }
    
    for(var i=0; i<geometries.length; i++) {
      geometries[i].__dirtyVertices = true;
    }
    
  
    // scene.objects.forEach(function(obj) {
    //   if(obj.type === "label") {
    //     var delta_x = obj.position.x - obj.draw_object.position.x;
    //     var delta_y = obj.position.y - obj.draw_object.position.y;
    //     if(Math.sqrt(delta_x*delta_x) > 300) {
    //       obj.position.x = obj.draw_object.position.x;
    //     }
    //     if(Math.sqrt(delta_y*delta_y) > 300) {
    //       obj.position.y = obj.draw_object.position.y;
    //     }
    //     drawText(obj, obj.draw_object.position.y);
    //   }
    // });
  
    renderer.render( scene, camera );
    // interaction.update();
    stats.update();
  }


  function drawText(draw_object, text) {
    draw_object.materials[0].map.image = null;
    var textCanvas = document.createElement( "canvas" );
    var xc = textCanvas.getContext("2d");
    // xc.shadowColor = "#000";
    // xc.shadowBlur = 7;
    xc.font = "50pt arial bold";
    xc.fillText(text, 10, 64);
    draw_object.materials[0].map.image = textCanvas;
  }

  function randomFromTo(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
  }
}