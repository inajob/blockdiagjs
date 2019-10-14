//  Copyright 2011 @ina_ani
//  Original version(written in Python) by Takeshi KOMIYA
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.


function $(s){
    return document.getElementById(s);
}

function parse(s,action){
    var parser = new Gin.Grammar({
	    graph:    /((id{0,1}):pushS (id{0,1}):pushS "{" stmt_list:pushSStack "}"):UNARGGRAPH/,
	    subgraph:/("group":sssshift (id{0,1}):pushS "{" stmt_list:pushSStack "}"):UNARGSUBGRAPH/,
	    stmt_list: /((stmt (";"){0,1})*)/, // semi-colon
	    stmt:/comment_stmt|attr_stmt|subgraph|graph_attr|edge_stmt|node_stmt/,
	    //stmt:/edge_stmt/,
	    comment_stmt:/($COMMENTLINE|$COMMENTMULTILINE)/,
	    edge_stmt:/(node_list:pushGStack (edge_rhs+):pushGStack attr_list:pushGStack):UNARGMAKE_EDGE/,
	    edge_rhs: /("<->"|"->"|"--"|"<-"):op node_list/,
	    node_stmt:/(node_id:pushGO attr_list:pushGStack):UNARGNODE/,
	    graph_attr:/(id "=":op id):MAKE_GRAPH_ATTR/,
	    attr_stmt:/(("graph"|"node"|"edge"):pushGR attr_list):UNARGATTRS/,
	    attr_list:/(("[" a_list* "]")*):FLATTEN/,
	    a_list:/(id ("=":op id){0,1} (","){0,1}):UNARGATTR/,
	    node_list:/(node_id ("," node_id)*):NODE_FLATTEN/,
	    node_id: /id/,
	    id:/(name|number|string):ID/,
	    name: /<[A-Za-z_\u0080-\uffff][A-Za-z_0-9\u0080-\uffff]*>/,
	    number: /([0-9]+("."[0-9]*){0,1})/,
	    string: /$JS_STRING/,
	    comm :/[^\n\r]+/

	},"graph", new Gin.Parser.RegExp(/[ \r\n]/));
    return parser.parse(s,action);
}
var action = {
    idstack:[],
    stack:[],
    gstack:[],
    sstack:[],
    ssstack:[],
    out:null,
    comm:function(v){alert(v)},
    init:function(){
	action.idstack = [];
	action.stack = [];
	action.gstack = [];
	action.sstack = [];
	action.ssstacl = [];
	action.out = null;
    },
    sssshift:function(){
	this.ssstack.push(this.gstack);
	this.gstack = [];
    },
    push:function(k,v){
	//this.idstack.push(k +"::"+v+"");
	this.idstack.push(v+"");
    },
    pop:function(){
	this.idstack.pop();
    },
    pushStack:function(){
	var l = [];
	for(var i=0;i<this.idstack.length;i++){
	    l.push(this.idstack[i]);
	}
	this.idstack = [];
	this.stack.push(l);
    },
    pushGStack:function(){
	var l = [];
	for(var i=0;i<this.stack.length;i++){
	    l.push(this.stack[i]);
	}
	this.stack = [];
	this.gstack.push(l);
    },
    pushR:function(v){
	//console.log("pushR+"+v)
	this.stack.push(v+"");
    },
    pushGR:function(v){
	//console.log("pushGR+"+v)
	this.gstack.push(v+"");
    },
    pushGO:function(v){
	//console.log("pushGO+"+v,this.idstack)
	this.gstack.push(this.idstack.pop());
    },
    pushSStack:function(){
	var l = [];
	for(var i=0;i<this.gstack.length;i++){
	    if(this.gstack[i].name == undefined){
		//console.log("ERROR not set name");
		//console.log(this.gstack[i]);
		continue;
	    }
	    l.push(this.gstack[i]);
	}
	this.gstack = [];
	this.sstack.push(l);
    },
    pushS:function(v){
	this.sstack.push(this.idstack.pop());
	//console.log("sstack:::"  + this.sstack)
    },
    idcache:null,
    ID:function(v){
	//console.log(">>>>"+v[0].match.input+"")
	
	if(this.idcache !=null){
	    if(v[0].match.input == this.idcache){
		//console.log("WARN re bind")
		//return ; //???
	    }
	}
	//console.log("ID " + v)
	this.push("id",v)

	this.idcache = v[0].match.input;
    },
    NODE_FLATTEN:function(v){
	//console.log("NODE_FLATTEN");
	//console.log(this.idstack);
	this.pushStack();
	//console.log(v);
    },
    UNARGATTR:function(v){
	//console.log("UNARGATTR");
	//console.log(this.idstack);
	this.pushStack();
	this.idstack = [];
	//console.log(v);
    },
    FLATTEN:function(v){
	//console.log("FLATTEN");
	//console.log(v);
	//console.log(this.idstack);
	//console.log(this.idstack.length);
	//this.pushStack();
	//console.log(this.gstack);
    },
    UNARGATTRS:function(v){
	//console.log("UNARGATTRS");
	//console.log(v);
	this.pushGStack();
	//console.log(this.gstack);
	var attrs = this.gstack.pop();
	var object = this.gstack.pop();
	var defattrs = {type:"attr_stmt",attrs:attrs,object:object}
	this.gstack.push(defattrs);
    },
    UNARGNODE:function(v){
	//console.log("UNARGNODE");
	var attrs = this.gstack.pop();
	var id = this.gstack.pop();
	//console.log("##ATTRS",id,attrs);

	var attrsl = [];
	for(var i = 0; i< attrs.length;i++){
	    attrsl.push({name:attrs[i][0],value:attrs[i][2]}); //todo: only one
	}
	//console.log(attrsl)
	var node = {name:"node_stmt",attrs:attrsl,id:id};
	this.gstack.push(node);	
    },
    MAKE_GRAPH_ATTR:function(v){
	//console.log("MAKE_GRAPH_ATTR");
	//console.log(v);
	var b = this.idstack.pop();
	var op = this.idstack.pop();
	var a = this.idstack.pop();
	var graph_attr = {name:"graph_attr",attr:{name:a,value:b}};
	this.gstack.push(graph_attr);
    },
    UNARGMAKE_EDGE:function(v){
	//console.log("UNARGMAKE_EDGE");
	//console.log(v);
	var attrs = this.gstack.pop();
	var xs    = this.gstack.pop();
	var x     = this.gstack.pop();
	var nodes = x;
	for(var i = 0;i <xs.length; i++){
	    nodes.push([xs[i][0],xs[i].slice(1)]);
	}
	
	//console.log("ATTRS",attrs);
	var attrsl = [];
	for(var i = 0; i< attrs.length;i++){
	    attrsl.push({name:attrs[i][0],value:attrs[i][2]}); //todo: only one
	}
	var edge = {name:"edge_stmt",nodes:nodes,attrs:attrsl};

	
	this.gstack.push(edge);
	//console.log(this.gstack.length);
	//console.log(this.gstack);
    },
    UNARGSUBGRAPH:function(v){
	//console.log("UNARGSUBGRAPH");
	//console.log(v);
	
	var stmts = this.sstack.pop();
	var id = this.sstack.pop();
	
	var subgraph = {name:"subgraph",stmts:stmts,id:id}
	//console.log(subgraph)

	this.gstack = this.ssstack.pop();
	this.gstack.push(subgraph);
    },
    UNARGGRAPH:function(v){
	//console.log("UNARGGRAPH");
	var stmts = this.sstack.pop();
	var id = this.sstack.pop();
	var type = this.sstack.pop();
	var graph = {name:"graph",type:type,id:id,stmts:stmts};
	
	//console.log(graph);
	this.out = graph;
    },
    log:function(v){
	//console.log("LOG: "+v);
	this.push("log",v);
    },
    op:function(v){
	//console.log("OP  : "+v);
	this.push('op',v);
    },
    name:function(v){
	//console.log("NAME: "+v);
	this.push("Name",v);
    },
    string:function(v){
	//console.log("STR : "+v);
	this.push("String",v);
    }
}

function dump(ar){
    if(ar instanceof Array){
	for(var i=0;i<ar.length;i++){
	    dump(ar[i]);
	}
    }else if(ar.value!=undefined){
	dump(ar.value);
    }else{
	console.log("" + ar);
    }
}

function _in(arr,v){
    if(arr instanceof Array){
	for(var i = 0; i < arr.length; i++){
	    if(v instanceof XY &&
	       arr[i] instanceof XY &&
	       v.x == arr[i].x &&
	       v.y == arr[i].y)
		return true;
	    if(v instanceof Array && _equal(arr[i],v))return true;
	    if(arr[i] == v)return true;
	}
    }else{
	for(x in arr){
	    //console.log(x,arr[x])
	    if(x == v)return true;
	}
    }
    return false;
}
function _remove(arr,v){
    for(var i = 0; i < arr.length; i++){
	if(arr[i] == v || (v instanceof Array && _equal(arr[i],v))){
	    arr.splice(i,1);
	    return arr;
	}
    }
    return arr;
}
function _index(arr,v){
    for(var i = 0; i < arr.length; i++){
	if(arr[i] == v){
	    return i;
	}
    }
    return -1;
}
function _equal(arr1,arr2){
    if(arr1.length != arr2.length)return false;
    if(arr1 == arr2)return true; // same instance
    for(var i =0 ; i < arr1.length; i++){
	if(arr1[i] != arr2[i]){
	    return false;
	}
    }
    return true;
}

var extend = function(dest, source){
    for (var property in source) {
        dest[property] = source[property];
    }
    return dest;
}

    function unquote(s){ return s}

var uuid = {
    count:0,
    generate:function(){
	return uuid.count++;
    }
};

function Set(arr){ // javascript set
    this.data =[];
    if(arr instanceof Array){
	for(var i = 0;i < arr.length;i++){
	    this.add(arr[i]);
	}
    }else{
	throw "unknown type for Set" + arr;
    }
}
Set.prototype.add = function(a){
    for(var i = 0; i < this.data.length; i++){
	if(this.data[i] == a){
	    return;
	}
    }
    this.data.push(a);
};
Set.prototype.intersect = function(set){
    var flag;
    var ret = new Set([]);
    for(var i = 0; i < this.data.length; i++){
	flag = false;
	for(var j = 0; j < set.data.length; j++){
	    if(this.data[i] == set.data[j]){
		flag = true;
		ret.add(this.data[i]);
		break;
	    }
	}
    }
    return ret;
};
Set.prototype.union = function(set){
    var ret = new Set([]);
    for(var i = 0; i < this.data.length; i++){
	ret.add(this.data[i]);
    }
    for(var j = 0; j < set.data.length; j++){
	ret.add(set.data[j]);
    }

    return ret;
};
Set.prototype.equal = function(set){
    var flag;
    if(set.data.legnth != this.data.length)return false;
    for(var i = 0; i < this.data.length; i++){
	flag = false;
	for(var j = 0; j < set.data.length; j++){
	    if(this.data[i] == set.data[j]){
		flag = true;
		break;
	    }
	}
	if(flag == false){
	    return false;
	}
    }
    return true;
};


function XY(x,y){
    this.x = x;
    this.y = y;
}
XY.prototype.equal = function(a){
    if(!(a instanceof XY))return false;
    if(a.x == this.x && a.y == this.y)return true;
    return false;
}

function Base(){

};
Base.int_attrs = ["width","height"];
Base.prototype = {
    duplicate:function(){
	// deep copy?
    },
    duplicate:function(attr){
	// cant implement it
    },
    set_attribute:function(attr){
	var name = attr.name;
	var value = unquote(attr.value);
	//console.log(name,value)
	// hashattr?
	if(this["set_"+name] != undefined){
	    this["set_"+name](value);
	}else if(_in(Base.int_attrs,name)){
	    this[name] = parseInt(value);
	}else if(this[name]!==undefined){
	    this[name] = value;
	}else{
	    throw "unknown attribute " + name;
	}
    },
    set_attributes:function(attrs){
	for(var i = 0; i < attrs.length; i++){
	    this.set_attribute(attrs[i]);
	}
    }
};

function Element(id){
    this.id = unquote(id);
    this.label = "";
    this.xy = new XY(0,0); // XY
    this.group = null;
    this.drawable = false;
    this.order = 0;
    this.color = Element.basecolor;
    this.width = 1;
    this.height = 1;
    this.stacked = false;

    this.uid = uuid.generate();
}

// === EXTEND ===
extend(Element,Base);
Element.prototype = new Base;
// === === === ===

Element.basecolor = [255,255,255];
Element.namespace = {};
Element.get = function(id){
    //console.log("GET from id",id)
    if(!id){
	id = uuid.generate(); // ERROR
    }
    unquote_id = unquote(id); // ERROR
    if(!_in(this.namespace,unquote_id)){
	var obj = new this(id);
	this.namespace[unquote_id] = obj;
    }
    //console.log(this.namespace[unquote_id]);
    return this.namespace[unquote_id];
};
Element.clear = function(){
    Element.namespace = {};
};
Element.prototype.toString = function(){
    return this.uid;
}
Element.prototype.set_color = function(color){
    this.color = color; // WARN not checked
};

function DiagramNode(id){
    Element.apply(this,[id]);
    
    this.label = unquote(id) || ''; // ERROR?
    this.shape = DiagramNode.default_shape;
    this.style = null;
    this.numbered = null;
    this.background = null;
    this.description = null;
    this.drawable = true;
}
// === EXTEND ===
extend(DiagramNode,Element);

DiagramNode.prototype = new Element;
// === === === ===

DiagramNode.basecolor = [255,255,255];
DiagramNode.default_shape = "box";
DiagramNode.set_default_shape= function(shape){
    DiagramNode.default_shape = shape;
}
DiagramNode.clear = function(){
    DiagramNode.namespace = {};
    DiagramNode.default_shape = "box";
};
DiagramNode.prototype.set_style = function(value){
    if(_in(['solid','dotted','dashed'],value)){
	this.style = value;
    }else{
	throw "unknown edge style";
    }
}
DiagramNode.prototype.set_shape = function(value){
    // WARN noderender??
    this.shape = value;
}
DiagramNode.prototype.set_background = function(value){
    // WARN urlutil?
    this.background = value;
}
DiagramNode.prototype.set_stacked = function(value){
    this.stacked = true;
}

function NodeGroup(id){
    Element.apply(this,[id]);
    
    this.href = null;
    this.level = 0;
    this.separated = false;
    this.shape = "box";
    this.nodes = [];
    this.edges = [];
    this.orientation = "landscape";
    this.color = [200,200,200];
}
// === EXTEND ===
extend(NodeGroup,Element);
NodeGroup.prototype = new Element;
// === === === ===

NodeGroup.basecolor = [243,152,0];
NodeGroup.prototype.parent = function(level){
    if(level == undefined){
	return this.group;
    }else{
	if(this.level < level){
	    return null;
	}
	var group = this;
	while(group.level != level){
	    group = group.group;
	}
	return group;
    }
}
NodeGroup.prototype.is_parent = function(other){
    var parent = this.parent (other.level);
    return parent == other;
}
NodeGroup.prototype.traverse_nodes = function(preorder){
    var ret  = [];
    for(var i = 0; i < this.nodes.length; i++){
	var node = this.nodes[i];
	if(node instanceof NodeGroup){
	    if(preorder){
		ret.push(node);
	    }
	    var nls = node.traverse_nodes(preorder);
	    for(var j = 0; j < nls.length; j ++){
		ret.push(nls[j]);
	    }
	    if(!preorder){
		ret.push(node);
	    }
	}else{
	    ret.push(node);
	}
    }
    return ret;
}
NodeGroup.prototype.traverse_groups = function(preorder){
    var nls = this.traverse_nodes(preorder);
    var ret = [];
    for(var i = 0; i < nls.length; i ++){
	node = nls[i];
	if(node instanceof NodeGroup){
	    ret.push(node);
	}
    }
    return ret;
}
NodeGroup.prototype.fixiate = function(fixiate_nodes){
    if(this.separated){
	this.width = 1;
	this.height = 1;
	return;
    }else if(this.nodes.length > 0){
	var t1 = 0;
	var t2 = 0;
	for(var i = 0; i < this.nodes.length; i++){
	    t1 = Math.max(this.nodes[i].xy.x + this.nodes[i].width, t1);
	    t2 = Math.max(this.nodes[i].xy.y + this.nodes[i].height, t2);
	}
	this.width = t1;
	this.height = t2;
    }
    for(var i = 0; i < this.nodes.length; i++){
	var node = this.nodes[i];
	if(fixiate_nodes){
	    node.xy = new XY(this.xy.x + node.xy.x, this.xy.y + node.xy.y);
	    if(node instanceof NodeGroup){
		node.fixiate(fixiate_nodes);
	    }
	}
    }
};
NodeGroup.prototype.update_order = function(){
    for(var i = 0; i < this.nodes.length; i++){
	this.nodes[i].order = i;
    }
}
NodeGroup.prototype.set_orientation = function(value){
    value = value.toLowerCase();
    if(_in(['landscape','portrait'],value)){
	this.orientation = value;
    }else{
	throw "unknown diagram orientation";
    }
}

function Diagram(id){
    NodeGroup.apply(this,[id]);
    
    this.node_width = null;
    this.node_height = null;
    this.span_width = null;
    this.span_height = null;
    this.page_padding = null;
    this.fontsize = null;
    this.edge_layout = null;
}
// === EXTEND ===
extend(Diagram,NodeGroup);
Diagram.prototype = new NodeGroup;
// === === === ===
Diagram.int_attrs = ['width',"height","fontsize",
		     "node_width","node_height","span_width","span_height"];

Diagram.prototype.set_default_shape = function(value){
    // WARN noderender
}
Diagram.prototype.shape_namespace = function(value){
    // WARN noderender
    //noderender.set_default_namespace(value);
}
Diagram.prototype.set_edge_layout = function(value){
    value = value.toLowerCase();
    if(_in(["normal","flowchart"],value)){
	this.edge_layout = value;
    }else{
	throw "unknown edge dir";
    }
}

function DiagramEdge(node1,node2){
    //
    this.node1 = node1;
    this.node2 = node2;
    this.crosspoints = [];
    this.skipped = 0;
    
    this.label = null;
    this.dir = 'forward';
    this.color = null;
    this.style= null;
    this.hsyle = null;
    this.folded = null;
    
    //this.uid = uuid.generate();
}
// === EXTEND ===
extend(DiagramEdge,Base);
DiagramEdge.prototype = new Base;
// === === === ===
DiagramEdge.namespace = {};

DiagramEdge.get = function(node1,node2){  // "this" is class
    var obj;
    if(!_in(this.namespace,node1)){
	this.namespace[node1] = {};
	//console.log("notfound node1 "+node1);
    }
    if(!_in(this.namespace[node1],node2)){
	obj = new this(node1,node2);
	this.namespace[node1][node2] = obj;
	//console.log("notfound node2 "+node2);
    }
    //console.log(node1,node2);
    //console.log("ret",obj,this);
    //console.log(DiagramEdge.namespace[node1][node2]);
    return this.namespace[node1][node2];
};
DiagramEdge.find = function(node1,node2){
    if(node2 == undefined) node2 = null;
    if(node1==null && node2==null){
	return DiagramEdge.find_all();
    }else if(node1 instanceof NodeGroup){
	var edges = DiagramEdge.find(null,node2);
	var ret = [];
	for(var i = 0; i < edges.length; i++){
	    if(edges[i].node1.group.is_parent(node1)){
		ret.push(edges[i]);
	    }
	}
	edges = ret;
	for(var i = 0; i < edges.length; i++){
	    if(edges[i].node2.group.is_parent(node1)){
		ret.push(edges[i]);
	    }
	}
	return ret;
    }else if(node1 == null){
	var ls = DiagramEdge.find_all();
	var ret = [];
	for(var i = 0; i < ls.length; i++){
	    if(ls[i].node2 == node2){
		ret.push(ls[i]);
	    }
	}
	return ret;
    }else{
	if(!_in(DiagramEdge.namespace,node1)){
	    return [];
	}
	if(node2 == null){
	    var ret = [];
	    for(x in DiagramEdge.namespace[node1]){
		ret.push(DiagramEdge.namespace[node1][x]);
	    }
	    return ret;
	}
	if(!_in(DiagramEdge.namespace,node2)){
	    return [];
	}
    }
    return DiagramEdge.namespace[node1][node2];
};
DiagramEdge.find_all = function(){
    var ret=[];
    for(var v1 in DiagramEdge.namespace){
	for(var v2 in DiagramEdge.namespace[v1]){
	    ret.push(DiagramEdge.namespace[v1][v2]);
	}
    }
    return ret;
}
DiagramEdge.find_by_level=function(level){
    var edges = [];
    var ls = DiagramEdge.find_all();
    for(var i=0;i<ls.length;i++){
	var e = ls[i];
	var edge = e.duplicate(); // ERROR DUPLICATE
	//console.log("!!! ERROR !!! DUPLICATE");
	//console.log(ls);
	var skips = 0;
	
	if(edge.node1.group.level < level){
	    skips += 1;
	}else{
	    while(edge.node1.group.level != level){
		edge.node1 = edge.node1.group;
	    }
	}
	if(edge.node2.group.level < level){
	    skips += 1;
	}else{
	    while(edge.node2.group.level != level){
		edge.node2 = edge.node2.group;
	    }
	}
	if(skips == 2){
	    continue;
	}
	edges.push(edge);
    }
    return edges;
};
DiagramEdge.clear = function(){
    DiagramEdge.namespace = {};
};

DiagramEdge.prototype.duplicate = function(){
    var ret = new DiagramEdge(this.node1,this.node2);
    //ret.folded = this.folded; // todo; all property copy
    for(var p in this){
	if(this.hasOwnProperty(p)){
	    ret[p] = this[p]
	}
    }
    return ret;
};

DiagramEdge.prototype.set_dir = function(value){
    value = value.toLowerCase();
    if(_in(["back","both","none","forward"],value)){
	this.dir = value;
    }else if(value == '->'){
	this.dir = "forward";
    }else if(value == "<-"){
	this.dif = "back";
    }else if(value == "<->"){
	this.dir = "both";
    }else if(value == "--"){
	this.dir = "none";
    }else{
	throw "unknown edge dir";
    }
};
DiagramEdge.prototype.set_style = function(value){
    value = value.toLowerCase();
    if(_in(["none","solid","dotted","dashed"],value)){
	this.dir = value;
    }else{
	throw "unknown edge style";
    }
};
DiagramEdge.prototype.set_hstyle = function(value){
    value = value.toLowerCase();
    if(_in(["generalization","composition","aggregation"],value)){
	this.hstyle = value;
    }else{
	throw "unknown edge hstyle";
    }
};
DiagramEdge.prototype.set_folded = function(value){
    this.folded  = true;
}
DiagramEdge.prototype.set_nofolded = function(value){
    this.folded  = false;
};

function ScreenNodeBuilder(){

}
ScreenNodeBuilder.build = function(tree,layout){
    if(layout == undefined)layout = true;
    DiagramNode.clear();
    DiagramEdge.clear();
    NodeGroup.clear();
    Diagram.clear();
    
    var diagram = (new DiagramTreeBuilder()).build(tree);
    if(layout){

	(new DiagramLayoutManager(diagram)).run();


	diagram.fixiate(true);
    }
    return diagram;
}

function DiagramTreeBuilder(){
}
DiagramTreeBuilder.prototype={
    build:function(tree){
	// singleton?
	var diagram = this.instantiate(new Diagram(),tree);
	var subgroup;
	var l = diagram.traverse_groups();
	for(var i = 0; i < l.length; i++){
	    subgroup = l[i];
	    if(subgroup.nodes.length == 0){
		//subgroup.group.nodes.remove(subgroup); // ERROR
		subgroup.group.nodes = _remove(subgroup.group.nodes, subgroup);
	    }
	}
	this.bind_edges(diagram);

	return diagram;
    },
    is_related_group:function(group1,group2){
	
    },
    belong_to:function(node,group){
	var override;
	if(node.group && node.group.level > group.level){
	    override = false;
	}else{
	    overide = true;
	}
	if(node.group && node.group != group && override){
	    if(!(this.is_related_group(node.group, group))){
		throw "couldnt belong to two groups";
	    }
	    var old_group = node.group;
	    var parent = group.parent(old_group.level + 1);
	    if(parent){
		if(_in(old_group.nodes,parent)){
		    //old_group.nodes.remove(parent); // ERROR
		    old_group.nodes = _remove(old_group.nodes,parent);
		}
		var index = old_group.nodes.index(node);
		//old_group.nodes.insert(index + 1, parent);
		old_group.nodes.splice(index + 1,0, parent);
	    }
	    //old_group.nodes.remove(node); // ERROR
	    old_group.nodes = _remove(old_group.nodes, node);

	    node.group = null;
	}
	if(node.group == null){
	    node.group = group;
	    if(!_in(group.nodes, node)){
		group.nodes.push(node);
	    }
	}
    },
    instantiate:function(group,tree){
	var stmt;
	//console.log("@@@@")
	//console.log(tree);
	//console.log(tree.stmts+"");
	for(var n = 0; n < tree.stmts.length; n++){
	    stmt = tree.stmts[n];
	    //console.log(stmt.name);
	    if(stmt.name == 'node_stmt'){
		var group_attr = [];
		for(var j = 0; j < stmt.attrs.length; j++){
		    if(stmt.attrs[j].name == 'group'){
			group_attr.push(stmt.attrs[j]);
		    }
		}
		if(group_attr.length != 0){
		    var group_id = group_attr[group_attr.length - 1];
		    //console.log(group_id);
		    //stmt.attrs.remove(group_id);   // ERROR
		    stmt.attrs = _remove(stmt.attrs, group_id);
		    if(group_id.valule != group.id){
			stmt = {type:'subgraph',id:group_id.value, stmts:[stmt]};
		    }
		}
	    }

	    //console.log("name::"+stmt.name,i);
	    if(stmt.name == 'node_stmt'){
		var node = DiagramNode.get(stmt.id); //?
		node.set_attributes(stmt.attrs);
		this.belong_to(node, group);
	    }else if(stmt.name == 'edge_stmt'){
		//console.log(stmt)
		var nodes = stmt.nodes.shift();
		//console.log(nodes)
		var edge_from = [];
		for(var i = 0; i < nodes.length; i ++){
		    edge_from.push(DiagramNode.get(nodes[i]));
		}
		//console.log("edge_from",edge_from)
		for(var i=0;i < edge_from.length; i ++){
		    node = edge_from[i];
		    this.belong_to(node, group);
		}
		
		//var count = 0;
		while(stmt.nodes.length>0){
		    var tmp = stmt.nodes.shift();
		    //console.log(tmp)
		    var edge_type  = tmp[0];
		    var edge_to = tmp[1];
		    
		    var ls = [];
		    for(var i=0;i < edge_to.length; i ++){
			node = edge_to[i];
			ls.push(DiagramNode.get(node));
		    }
		    edge_to = ls;
		    for(var i=0;i < edge_to.length; i ++){
			node = edge_to[i];
			this.belong_to(node, group);
		    }
		    
		    for(var i=0;i < edge_from.length; i ++){
			for(var j=0;j < edge_to.length; j ++){
			    var node1 = edge_from[i];
			    var node2 = edge_to[j];
			    //console.log("line",node1,node2);
			    //console.log(edge_from,edge_to);
				
			    var edge = DiagramEdge.get(node1, node2);
			    //console.log(edge,node1,node2)
			    if(edge_type){
				// ??
				var attrs = [{name:'dir',value:edge_type}]; // [1]??? ["Op","->"]
				edge.set_attributes(attrs);
			    }
			    edge.set_attributes(stmt.attrs);
			}
		    }
		    
		    edge_from = edge_to;
		    
		    //console.log("aa");
		    //console.log("type",edge_type,"edge_to",edge_to);
		    //count ++;
		    
		    //if(count>10)break;
		}
		
	    }else if(stmt.name == 'subgraph'){
		var subgroup = NodeGroup.get(stmt.id);
		subgroup.level = group.level + 1;
		this.belong_to(subgroup, group);
		this.instantiate(subgroup, stmt);
	    }else if(stmt.name == 'graph_attr'){
		group.set_attribute(stmt.attr);
	    }else{
		throw "Attribute Error";
	    }
	}
	group.update_order();
	return group;
    },
    bind_edges:function(group){
	var node;
	//console.log(group)
	//if(group.nodes==undefined)return // ????
	for(var i = 0; i < group.nodes.length; i ++){
	    //console.log("@@",group.nodes[i]);

	    node = group.nodes[i];
	    if(node instanceof DiagramNode){
		var tmp;
		group.edges = group.edges.concat(tmp = DiagramEdge.find(node));
	    }else{
		this.bind_edges(node);
	    }
	}
    }
};

function NodeShape(node,metrix){
    this.node = node;
    this.metrix = metrix;
    var m;
    if(this.metrix){
	m = this.metrix.cell(this.node);
	this.textbox = m.box();
	this.connectors = [m.top(),m.right(),m.bottom(),m.left()];
    }
    this.textalign = "center";
}
NodeShape.prototype.render = function(drawer,format,opt){
    if(this.node.stcked){ // todo:option?
	var node = this.node; // ERROR dupulicate
	// node = node.duplicate();
	console.log("!!!!ERROR!!!! duplicate");
	node.lavel = "";
	node.background = "";
	var r;
	for(var i = 2; i > 0; i--){
	    r = this.metrix.cellSize /2 * i;
	    metrix = this.metrix.shiftMetrix(r,0,0,r);
	}
    }
    //if(this.render_vector_shape != undefined)
    this.render_shape(drawer,format,opt);
    this.render_label(drawer);
    this.render_number_badge(drawer,format);
};
NodeShape.prototype.render_shape = function(drawer,format){
    //console.log("render_shape")
};
NodeShape.prototype.render_label = function(drawer){
    var font ="";
    var fill = "";
    // todo: shadow check
    drawer.textarea(this.textbox,this.node.label)
    //console.log("render_label");
}
NodeShape.prototype.render_number_badge = function(drawer){
    if(this.node.numbered != null){ // todo: shadow.check
	var font = "";
	var fill = "";
	var badgeFill = "";

	var xy = this.metrix.cell(this.node).topLeft();
	var r = this.metrix.cellSize * 3 /2;

	box(xy.x - r, xy.y -r , xy.x + r , xy.y + r);
	drawer.ellipse(box,fill,badgeFill);
	//drawer.textaera(
    }
}
NodeShape.prototype.top = function(){
    return this.connectors[0];
}
NodeShape.prototype.left = function(){
    return this.connectors[3];
}
NodeShape.prototype.right = function(){
    var point = this.connectors[1];
    if(this.node.stacked){
	point = new XY(point.x + this.metrix.cellSize, point.y);
    }
    return point
}
NodeShape.prototype.bottom = function(){
    var point = this.connectors[2];
    if(this.node.stacked){
	point = new XY(point.x, point.y + this.metrix.cellSize);
    }
    return point
}
NodeShape.prototype.shift_shadow = function(value){
    var xdiff = this.metrix.shadowOffsetX;
    var ydiff = this.metrix.shadowOffesetY;
    var ret;
    if(value instanceof XY){
	ret = new XY(value.x + xdiff, value.y + ydiff);
    }else if(value instanceof Array){
	if(value[0] instanceof XY || value[0] instanceof Array){
	    ret = [];
	    for(var i = 0; i < value.length; i++){
		ret.push(this.shift_shadow(value[i]));
	    }
	}else{
	    ret = [];
	    for(var i = 0; i < value.length; i++){
		if(i%2 == 0){
		    ret.push(x + xdiff);
		}else{
		    ret.push(y + ydiff);
		}
	    }
	}
    }
    return ret;
};

function Box(node,metrix){
    NodeShape.apply(this,[node,metrix]);
    //console.log("BOX",node,metrix);
}
// === EXTEND ===
extend(Box,NodeShape);
Box.prototype = new NodeShape;
// === === === ===
Box.prototype.render_shape = function(drawer,format,opt){
    var outline,fill;
    if(opt){
	outline = opt.outline;
	fill = opt.fill;
    }
    //console.log("render_shape BOX");
    var box = this.metrix.cell(this.node).box()
    // todo: shadow
    if(this.node.background){
	//drawer.rectangle();
	//drawer.loadImage();

	//drawer.rectangle(box);
    }else{
	//drawer.rectangle(box);
    }

    drawer.rectangle(box,{fill:this.node.color,outline:outline,stylle:this.node.style});
    //console.log("RECTANGLE",box,this.node.id,drawer);
}


var noderenderer = {
    renderers:{
	'box':Box
    },
    get:function(shape){
	//if (noderenderer == null){
	//    noderenderer.init_renderers();
	//}
	return noderenderer.renderers[shape];
    }
};

function CanvasDrawer(){
    this.canv = $('canv')
    this.ctx = this.canv.getContext("2d");
    this.ctx.clearRect(0,0,800,800);

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.lineWidth = 2;
};
CanvasDrawer.prototype.line = function(xy,opt){
    //console.log("CanvasDrawer line",xy,opt);

    this.ctx.beginPath();
    this.ctx.moveTo(xy[0].x, xy[0].y);
    for(var i = 1 ; i < xy.length; i++){
	this.ctx.lineTo(xy[i].x, xy[i].y);
    }
    if(opt.fill){
	this.ctx.fillStyle = opt.fill;
	this.ctx.fill();
    }
    this.ctx.stroke();
    /*
    for(var i = 0 ; i < xy.length; i++){
	this.ctx.fillRect(xy[i].x, xy[i].y,5,5);
    }
    */

};
CanvasDrawer.prototype.label = function(box,string,opt){
    //var lines = 
    //this.rectangle(lines.outlineBox(),{fill:"white",outline:"black"});
    //this.textarea(box,string,opt);
    this.text(box,string,opt); // dummy
}
CanvasDrawer.prototype.rectangle = function(box,opt){
    //console.log("CanvasDrawer rectangle",box);
    if(opt){
	if(opt.fill){
	    if(opt.fill instanceof Array){
		this.ctx.fillStyle = 'rgb('+opt.fill.join(',') + ')'; // convert
	    }else{
		//console.log("FILL",opt.fill)
		this.ctx.fillStyle = opt.fill;
	    }
	}
	if(opt.outline){
	    if(opt.outline instanceof Array){
		this.ctx.strokeStyle = 'rgb('+opt.outline.join(',') + ')'; // convert
	    }else{
		this.ctx.strokeStyle = opt.outline;
	    }
	}else{
	    this.ctx.strokeStyle = "black";
	}
	if(opt.outline){
	    this.ctx.strokeStyle = opt.outline;
	}
	if(opt.filter){
	    if(opt.filter == "blur"){
		
	    }
	}
    }
    this.ctx.beginPath();
    this.ctx.rect(box[0],box[1],box[2] - box[0], box[3] - box[1]);
    if(opt.fill){
	this.ctx.fill();
    }
    this.ctx.stroke();

};
CanvasDrawer.prototype.text = function(xy_box,text){
    // todo: skip option
    // todo: skip size
    this.ctx.font = "18px 'Times New Roman'";
    this.ctx.fillStyle= "rgb(0,0,0)";
    this.ctx.fillText(text,(xy_box[0] + xy_box[2])/2,(xy_box[1] + xy_box[3])/2);
}
CanvasDrawer.prototype.textarea = function(box,label){
    //console.log("CanvasDrawer textarea", box, label);
    // todo: multiline
    this.text(box,label); // adjust
}
function DiagramDraw(format,diagram){
    this.format = format.toLowerCase();
    this.diagram = diagram;
    this.fill = [0,0,0]; // todo: option
    this.badgeFill = "pink"; // todo: option
    this.font = null; // todo: option
    //this.filename  // todo: nouse
    
    this.scale_ratio = 1; // todo: option
    this.metrix = new DiagramDraw.MetrixClass(diagram, this.scale_ratio);
    
    this.shadow = [64,64,64];
        
    this.drawer = new CanvasDrawer(); // todo: later

    //mk nodes
    this.nodes = [];
    var i,seq,node,e,edge,group;
    if(this.diagram.separated){
	seq = this.diagram.nodes;
    }else{
	seq = this.diagram.traverse_nodes();
    }
    for(var i = 0; i < seq.length; i++){
	node = seq[i];
	if(node.drawable){
	    this.nodes.push(node);
	}
    }

    // mk groups
    this.groups = [];
    if(this.diagram.separated){
	seq = this.diagram.nodes;
    }else{
	seq= this.diagram.traverse_groups(true);
    }
    for(var i = 0; i < seq.length; i++){
	group = seq[i];
	if(!group.drawable){
	    this.groups.push(group);
	}
    }
        
    // mk edges
    this.edges = [];
    for(var i = 0; i < this.diagram.edges.length;i++){
	e = this.diagram.edges[i];
	if(e.style != 'none'){
	    this.edges.push(e);
	}
    }
    for(var i = 0; i < this.groups.length;i++){
	group = this.groups[i];
	for(var j = 0; j < group.edges.length; j++){
	    edge = group.edges[j];
	    if(edge.style != 'none'){
		this.edges.push(edge);
	    }
	}
    }
}	
DiagramDraw.MetrixClass = null;
DiagramDraw.setMetrixClass = function(MetrixClass){
    DiagramDraw.MetrixClass = MetrixClass
}
DiagramDraw.prototype.node = function(node){
    var r = noderenderer.get(node.shape);
    
    var shape = new r(node,this.metrix);
    shape.render(this.drawer,this.format,this.fill,this.fill,this.font,this.badgeFill);
};
DiagramDraw.prototype.edge = function(edge){
    var metrix = this.metrix.edge(edge);
    // todo: skip properties
    var color;
    if(edge.color){
	color = edge.color;
    }else{
	color = this.fill;
    }

    //console.log("DiagramDraw edge");
    //console.log("polylines",metrix.shaft().polylines);
    var lines = metrix.shaft().polylines;
    var line;
    for(var i=0; i < lines.length; i++){
	line  = lines[i];
	this.drawer.line(line,{fill:undefined});
    }
    //console.log("heads",metrix,metrix.heads());
    var heads = metrix.heads();
    var head;
    for(var i=0; i < heads.length; i++){
	head  = heads[i];
	this.drawer.line(head,{fill:color});
    }

};
DiagramDraw.prototype.edge_label = function(edge){
    var metrix = this.metrix.edge(edge);

    if(edge.label){
	this.drawer.label(metrix.labelbox(), edge.label, {fill:this.fill,font:this.font,fontsize:this.metrix.fontSize});
    }
};

DiagramDraw.prototype.draw = function(){
    this._prepare_edges();
    this._draw_background();
    
    if(this.scale_ratio > 1){
	var pagesize = this.pagesize(true);
	this.drawer.resizeCanvas(pagesize);
    }
    var node,edge;
    for(var i = 0; i < this.nodes.length; i++){
	node = this.nodes[i];
	this.node(node);
    }
    /*
    for(var i = 0; i < this.groups.length; i++){
	node = this.groups[i];
	this.group_label(node);
    }
    */
    for(var i = 0; i < this.edges.length; i++){
	edge = this.edges[i];
	this.edge(edge);
    }
    for(var i = 0; i < this.edges.length; i++){
	edge = this.edges[i];
	if(edge.label){
	    this.edge_label(edge);
	}
    }
};

DiagramDraw.prototype._prepare_edges = function(){
    for(var i = 0; i < this.edges.length; i++){
	var edge = this.edges[i];
	var m = this.metrix.edge(edge);
	var dir = m.direction();
	var r,xy,nodes,ret;
	if(edge.node1.group.orientation == 'landscape'){
	    if(dir == 'right'){
		for(var x = edge.node1.xy.x + 1; x < edge.node2.xy.x; x++){
		    xy = new XY(x, edge.node1.xy.y);
		    ret = [];
		    for(var j = 0; j < this.nodes.length; j++){
			if(this.nodes[j].xy.equal(xy)){ // todo ?
			    ret.push(this.nodes[j]);
			}
		    }
		    nodes = ret;
		    if(nodes.length>0){
			edge.skipped = 1;
		    }
		}
	    }else if(dir == 'right-up'){
		for(var x = edge.node1.xy.x + 1; x < edge.node2.xy.x; x++){
		    xy = new XY(x, edge.node1.xy.y);
		    ret = [];
		    for(var j = 0; j < this.nodes.length; j++){
			if(this.nodes[j].xy.equal(xy)){ // todo ?
			    ret.push(this.nodes[j]);
			}
		    }
		    nodes = ret;
		    if(nodes.length>0){
			edge.skipped = 1;
		    }
		}
	    }else if(dir == 'right-down'){
		if(this.diagram.edge_layout == 'flowchart'){
		    for(var y = edge.node1.xy.y; y < edge.node2.xy.y; y++){
			xy = new XY(edge.node1.xy.x, y + 1);
			ret = [];
			for(var j = 0; j < this.nodes.length; j++){
			    if(this.nodes[j].xy.equal(xy)){ // todo ?
				ret.push(this.nodes[j]);
			    }
			}
			nodes = ret;
			if(nodes.length>0){
			    edge.skipped = 1;
			}
		    }
		}else{
		    for(var x = edge.node1.xy.x + 1; x < edge.node2.xy.x; x++){
			xy = new XY(x, edge.node2.xy.y);
			ret = [];
			for(var j = 0; j < this.nodes.length; j++){
			    if(this.nodes[j].xy.equal(xy)){ // todo ?
				ret.push(this.nodes[j]);
			    }
			}
			nodes = ret;
			if(nodes.length>0){
			    edge.skipped = 1;
			}
		    }
		}
	    }else if(_in(['left-down','down'],dir)){
		for(var y = edge.node1.xy.y + 1; y < edge.node2.xy.y; y++){
		    xy = new XY(edge.node1.xy.x, y);
		    ret = [];
		    for(var j = 0; j < this.nodes.length; j++){
			if(this.nodes[j].xy.equal(xy)){ // todo ?
			    ret.push(this.nodes[j]);
			}
		    }
		    nodes = ret;
		    if(nodes.length>0){
			edge.skipped = 1;
		    }
		}
	    }else if(dir == 'up'){
		for(var y = edge.node2.xy.y + 1; y < edge.node1.xy.y; y++){
		    xy = new XY(edge.node1.xy.x, y);
		    ret = [];
		    for(var j = 0; j < this.nodes.length; j++){
			if(this.nodes[j].xy.equal(xy)){ // todo ?
			    ret.push(this.nodes[j]);
			}
		    }
		    nodes = ret;
		    if(nodes.length>0){
			edge.skipped = 1;
		    }
		}
	    }
	    // landscape
	}else{ // portrait
	    if(dir == 'right'){
		for(var x = edge.node1.xy.x + 1; x < edge.node2.xy.x; x++){
		    xy = new XY(x, edge.node1.xy.y);
		    ret = [];
		    for(var j = 0; j < this.nodes.length; j++){
			if(this.nodes[j].xy.equal(xy)){ // todo ?
			    ret.push(this.nodes[j]);
			}
		    }
		    nodes = ret;
		    if(nodes.length>0){
			edge.skipped = 1;
		    }
		}
	    }else if(_in(['left-down','down'],dir)){
		for(var y = edge.node1.xy.y + 1; y < edge.node2.xy.y; y++){
		    xy = new XY(edge.node1.xy.x, y);
		    ret = [];
		    for(var j = 0; j < this.nodes.length; j++){
			if(this.nodes[j].xy.equal(xy)){ // todo ?
			    ret.push(this.nodes[j]);
			}
		    }
		    nodes = ret;
		    if(nodes.length>0){
			edge.skipped = 1;
		    }
		}
	    }else if(dir == 'right-down'){
		if(this.diagram.edge_layout == 'flowchart'){
		    for(var x = edge.node1.xy.x ; x < edge.node2.xy.x; x++){
			xy = new XY(x + 1, edge.node1.xy.y);
			ret = [];
			for(var j = 0; j < this.nodes.length; j++){
			    if(this.nodes[j].xy.equal(xy)){ // todo ?
				ret.push(this.nodes[j]);
			    }
			}
			nodes = ret;
			if(nodes.length>0){
			    edge.skipped = 1;
			}
		    }
		}else{
		    for(var y = edge.node1.xy.y + 1; y < edge.node2.xy.y; y++){
			xy = new XY(edge.node2.xy.x, y);
			ret = [];
			for(var j = 0; j < this.nodes.length; j++){
			    if(this.nodes[j].xy.equal(xy)){ // todo ?
				ret.push(this.nodes[j]);
			    }
			}
			nodes = ret;
			if(nodes.length>0){
			    edge.skipped = 1;
			}
		    }
		}
	    }
	} //
    } // for
}
DiagramDraw.prototype._draw_background = function(){
    var metrix = this.metrix.originalMetrix();
    var node,box;
    for(var i = 0; i < this.groups.length;i++){
	node = this.groups[i];
	console.log("BACKGROUND",node.height,node.width);
	box = metrix.cell(node).marginBox();
	// todo: link
	this.drawer.rectangle(box,{outline:"transparent",fill:node.color,filter:'blur'});
    }
    // todo: skip draw shadows
    // todo: skip png bg smoothing
};

function DiagramMetrix(diagram){
    // DiagramMetrix
    this.diagram = diagram;  // todo: ina_ani original

    this.scale_ratio = 1;
    this.cellSize = 8+2;
    this.nodePadding = 4;
    this.lineSpaceing = 2;
    this.shadowOffsetX = 3;
    this.shadowOffsetY = 6;

    this.edge_layout = diagram.edge_layout;
    var cellsize = this.cellSize/this.scale_ratio;
    
    if(diagram.node_width){
	this.nodeWidth = diagram.node_width;
    }else{
	this.nodeWidth = cellsize * 16;
    }
    if(diagram.node_height){
	this.nodeHeight = diagram.node_height;
    }else{
	this.nodeHeight  = cellsize * 4;
    }
    if(diagram.span_width){
	this.spanWidth = diagram.span_width;
    }else{
	this.spanWidth = cellsize * 2*8;
    }
    if(diagram.span_height){
	this.spanHeight = diagram.span_heigt;
    }else{
	this.spanHeight = cellsize * 4;
    }
    if(diagram.fontsize){
	this.fontSize = diagram.fontsize;
    }else{
	this.fontSize = 12;
    }
    if(diagram.page_padding){
	this.pagePadding = diagram.page_padding;
    }else{
	this.pagePadding = [0,0,0,0];
    }
    var pageMarginX = cellsize *3;
    if(pageMarginX < this.spanWidth/this.scale_ratio){
	pageMarginX = this.spanWidth / this.scale_ratio;
    }
    var pageMarginY = cellsize * 3;
    if(pageMarginY < this.spanHeight/this.scale_ratio){
	pageMarginY = this.spanHeight/this.scale_ratio + cellsize;
    }
    this.pageMargin = new XY(pageMarginX, pageMarginY);
}
DiagramMetrix.prototype.originalMetrix = function(){
    return new DiagramMetrix(this.diagram); // todo: other properties
}
DiagramMetrix.prototype.cell = function(node){
    return new NodeMetrix(node,this);

};
DiagramMetrix.prototype.node = function(node){
    var renderer = noderenderer.get(node.shape);
    if(renderer.render != undefined){
	return new renderer(node,this);
    }else{
	return new NodeMetrix(node,this);
    }
}
DiagramMetrix.prototype.edge = function(edge){
    if(this.edge_layout == 'flowchart'){
	if(edge.node1.group.orientation == 'landscape'){
	    return new FlowchartLandscapeEdgeMetrix(edge,this);
	}else{
	    return new FlowchartPortraitEdgeMetrix(edge,this);
	}
    }else{
	if(edge.node1.group.orientation == 'landscape'){
	    return new LandscapeEdgeMetrix(edge,this);
	}else{
	    return new PortraitEdgeMetrix(edge,this);
	}	
    }
};

function EdgeLines(metrix){
    this.xy = null;
    this.cellSize = metrix.cellSize;
    this.stroking = false;
    this.polylines  = [];
}
EdgeLines.prototype.moveTo = function(x,y){
    if(y == undefined)y = null;
    if(y == null){
	this.xy = x;
    }else{
	this.xy = new XY(x,y);
    }
};
EdgeLines.prototype.lineTo = function(x,y){
    var elem;
    var polyline;
    if(y == undefined)y = null;
    if(y == null){
	elem = x;
    }else{
	elem = new XY(x, y);
    }
    if(this.stroking == false){
	this.stroking = true;
	polyline = [];
	if(this.xy){
	    polyline.push(this.xy);
	}
	this.polylines.push(polyline);
    }
    var tmp = this.polylines[this.polylines.length - 1];
    if(tmp.length > 0){
	var tmp2 = tmp[tmp.length - 1];
	if(tmp2 == elem){  // todo: equal?
	    return;
	}
    }
    tmp.push(elem);
}; 
EdgeLines.prototype.lines = function(x,y){
    var lines = [];
    var line;
    var start;
    var elem,ls;;
    for(var i = 0; i < this.polylines.length; i++){
	line = this.polylines[i];
	sart = line[0];
	ls = line.slice(1);
	for(var j = 0; j < ls.length; j++){
	    elem = ls[j];
	    lines.push([start,elem]);
	    start = elem;
	}
    }
    return lines;
};
function EdgeMetrix(edge,metrix){
    this.metrix = metrix;
    this.edge = edge;
}
EdgeMetrix.prototype.direction = function(){
    var node1 = this.metrix.cell(this.edge.node1);
    var node2 = this.metrix.cell(this.edge.node2);
    var dir ;
    if(node1.x > node2.x){
	if(node1.y > node2.y){
	    dir = 'left-up';
	}else if(node1.y == node2.y){
	    dir = 'left';
	}else{
	    dir = 'left-down';
	}
    }else if(node1.x == node2.x){
	if(node1.y >node2.y){
	    dir = 'up';
	}else if(node1.y == node2.y){
	    dir = 'same';
	}else{
	    dir = 'down';
	}
    }else{
	if(node1.y > node2.y){
	    dir = 'right-up';
	}else if(node1.y == node2.y){
	    dir = 'right';
	}else{
	    dir = 'right-down';
	}
    }
    return dir;
}
EdgeMetrix.prototype.heads = function(){
    //
};
EdgeMetrix.prototype._head = function(node,direct){
    var head = [];
    var cell = this.metrix.cellSize;
    var node = this.metrix.node(node);
    var xy;
    if(direct == 'up'){
	xy  = node.bottom();
	head.push(xy);
	head.push(new XY(xy.x - cell / 2, xy.y + cell));
	head.push(new XY(xy.x, xy.y + cell * 2));
	head.push(new XY(xy.x + cell / 2, xy.y + cell));
	head.push(xy);
    }else if(direct == 'down'){
	xy  = node.top();
	head.push(xy);
	head.push(new XY(xy.x - cell / 2, xy.y - cell));
	head.push(new XY(xy.x, xy.y - cell * 2));
	head.push(new XY(xy.x + cell / 2, xy.y - cell));
	head.push(xy);	
    }else if(direct == 'right'){
	xy  = node.left();
	head.push(xy);
	head.push(new XY(xy.x - cell, xy.y - cell / 2));
	head.push(new XY(xy.x - cell * 2, xy.y));
	head.push(new XY(xy.x - cell, xy.y + cell / 2));
	head.push(xy);
    }else if(direct == 'left'){
	xy  = node.right();
	head.push(xy);
	head.push(new XY(xy.x + cell, xy.y - cell / 2));
	head.push(new XY(xy.x + cell * 2, xy.y));
	head.push(new XY(xy.x + cell, xy.y + cell / 2));
	head.push(xy);	
    }
    if(!_in(['composition','aggregation'],this.edge.hstyle)){
	//head.pop(2); // todo: ok?
	head.splice(2,1);
    }
    return head;
};
EdgeMetrix.prototype.shaft = function(){
    //
}
EdgeMetrix.prototype.labelbox = function(){
    //
};

function PortraitEdgeMetrix(edge, metrix){
    EdgeMetrix.apply(this,[edge,metrix]);
}
// === EXTEND ===
extend(PortraitEdgeMetrix,EdgeMetrix);
PortraitEdgeMetrix.prototype = new EdgeMetrix;
// === === === ===
PortraitEdgeMetrix.prototype.heads = function(){
    var heads = [];
    var dir = this.direction();
    if(_in(['back','both'],this.edge.dir)){
	if(dir == 'right'){
	    if(this.edge.skipped){
		heads.push(this._head(this.edge.node1, 'up'));
	    }else{
		heads.push(this._head(this.edge.node1, 'left'));
	    }
	}else if(_in(['up','right-up','same'], dir)){
	    heads.push(this._head(this.edge.node1, 'up'));
	}else if(_in(['left-up','left'],dir)){
	    heads.push(this._heads(this.edge.node1, 'left'));
	}else if(_in(['keft-down','down','right-down'], dir)){
	    if(this.edge.skipped){
		heads.push(this._head(this.edge.node1, 'left'));
	    }else{
		heads.push(this._head(this.edge.node1, 'up'));
	    }
	}
    }
    if(_in(['forward','both'],this.edge.dir)){
	if(dir == 'right'){	
	    if(this.edge.skipped){
		heads.push(this._head(this.edge.node2, 'down'));
	    }else{
		heads.push(this._head(this.edge.node2, 'right'));
	    }
	}else if(_in(['up','right-up','same'],dir)){
	    heads.push(this._head(this.edge.node2, 'down'));
	}else if(_in(['left-up','left','left-down','down','right-down'],dir)){
	    heads.push(this._head(this.edge.node2, 'down'));
	}
    }
    return heads;
};
PortraitEdgeMetrix.prototype.shaft = function(){
    var span = new XY(this.metrix.spanWidth, this.metrix.spanHeight);
    var dir = this.direction();
    var node1 = this.metrix.node(this.edge.node1);
    var cell1 = this.metrix.cell(this.edge.node1);
    var node2 = this.metrix.node(this.edge.node2);
    var cell2 = this.metrix.cell(this.edge.node2);
    
    var shaft = new EdgeLines(this.metrix);
    
    if(_in(['up','right-up','same','right'], dir)){
	if(dir == 'right' && !this.edge.skipped){
	    shaft.moveTo(node1.right());
	    shaft.lineTo(node2.left());
	}else{
	    shaft.moveTo(node1.bottom());
	    shaft.lineTo(cell1.bottom().x, cell1.bottom().y + span.y / 2);
	    shaft.lineTo(cell2.right().x + span.x / 4, cell1.bottom().y + span.y / 2);
	    shaft.lineTo(cell2.right().x + span.x / 4, cell2.top().y - span.y / 2 + span.y / 8);
	    shaft.lineTo(cell2.top().x, cell2.top().y - span.y / 2 + span.y / 8);
	    shaft.lineTo(node2.top());
	}
    }else if(dir == 'right-down'){
	shaft.moveTo(node1.bottom());
	shaft.lineTo(cell1.bottom().x, cell1.bottom().y + span.y / 2);

	if(this.edge.skipped){
	    shaft.lineTo(cell2.left().x - span.x / 2, cell1.bottom().y + span.y /2);
	    shaft.lineTo(cell2.topLeft().x - span.x / 2, cell2.topLeft().y - span.y / 2);
	    shaft.lineTo(cell2.top().x ,cell2.top().y - span.y / 2);
	}else{
	    shaft.lineTo(cell2.top().x, cell1.bottom().y + span.y / 2);
	}
	shaft.lineTo(node2.top());
    }else if(_in(['left-up', 'left', 'same'], dir)){
	shaft.moveTo(node1.right());
	shaft.lineTo(cell1.right().x + span.x / 4, cell1.right().y);
	shaft.lineTo(cell1.right().x + span.x / 4, cell2.top().y - span.y / 2 + span.y / 8);
	shaft.lineTo(cell2.top().x, cell2.top().y - span.y / 2 + span.y / 8);
	shaft.lineTo(node2.top());
    }else if(dir == 'left-down'){
	shaft.moveTo(node1.bottom());
	if(this.edge.skipped){
	    shaft.lineTo(cell1.bottom().x, cell1.bottom().y + span.y /2);
	    shaft.lineTo(cell2.right().x + span.x / 2, cell1.bottom().y + span.y / 2);
	    shaft.lineTo(cell2.right().x + span.x / 2, cell2.tio().x + span.y / 2);
	}else{
	    shaft.lineTo(cell1.bottom().x, cell2.top().y - span.y / 2);
	}
	shaft.lineTo(cell2.top().x, cell2.top().y - span.y / 2);
	shaft.lineTo(node2.top());
    }else if(dir == 'down'){
	shaft.moveTo(node1.bottom());
	if(this.edge.skipped){
	    shaft.lineTo(cell1.bottom().x, cell1.bottom().y + span.y / 2);
	    shaft.lineTo(cell1.right().x + span.x / 2, cell1.bottom().y + span.y / 2);
	    shaft.lineTo(cell2.right().x +  span.x / 2, cell2.top().y - span.y / 2);
	    shaft.lineTo(cell2.top().x, cell2.top().y - span.y / 2);
	}
	shaft.lineTo(node2.top());
    }
    return shaft;
};
PortraitEdgeMetrix.prototype.labelbox = function(){
    var span = new XY(this.metrix.spanWidth, this.metrix.spanHeight);
    var dir = this.direction();
    var node1 = this.metrix.cell(this.edge.node1);
    var node2 = this.metrix.cell(this.edge.node2);
    var box;
    if(dir == 'right'){
	if(this.edge.skipped){
	    box = [node1.bottomRight().x + span.x,
		   node1.bototmRight().y,
		   node2.bottomLeft().x - span.x,
		   node2.bototmLeft().y - span.y / 2];
	}else{
	    box = [node1.topRight().x,
		   node1.topRight().y - span.y /8,
		   node2.left().x,
		   node2.left().y - span.y /8];
	}
    }else if(dir == 'right-up'){
	box = [node2.left().x - span.x,
	       node2.left().y,
	       node2.bottomLeft().x,
	       node2.bottomLeft().y];
    }else if(dir == 'right-down'){
	box = [node2.topLeft().x,
	       node2.topLeft().y - span.y / 2,
	       node2.top().x,
	       node2.top().y]
    }else if(_in(['up','left-up','left','same'])){
	if(this.edge.node2.xy.y < this.edge.node1.xy.y){
	    box = [node1.topRight().x - span.x / 2 + span.x / 4,
		   node1.topRight().y - span.y / 2,
		   node1.topRight().x + span.x / 2 + span.x / 4,
		   node1.topRight().y]
	}else{
	    box = [node1.top().x + span.x / 4,
		   node1.top().y - span.y,
		   node1.topRight().y + span.x / 4,
		   node1.tioRight().y - span.y / 2]
	}
    }else if(_in(['left-down','down'],dir)){
	box = [node2.top().x + span.x / 4,
	       node2.top().y - span.y / 2,
	       node2.topRight().x + span.x / 4,
	       node2.topRight().y];
    }
    // shrink box
    box = [box[0] + span.x / 8, box[1], box[2] - span.x / 8, box[3]];
    return box;
};


function LandscapeEdgeMetrix(edge, metrix){
    EdgeMetrix.apply(this,[edge,metrix]);
}
// === EXTEND ===
extend(LandscapeEdgeMetrix,EdgeMetrix);
LandscapeEdgeMetrix.prototype = new EdgeMetrix;
// === === === ===
LandscapeEdgeMetrix.prototype.heads = function(){
    var heads = [];
    var dir = this.direction();
    if(_in(['back','both'],this.edge.dir)){
	if(_in(['left-up','left','same','right-up','right','right-down'],dir)){
	    heads.push(this._head(this.edge.node1, 'left'));
	}else if(dir == 'up'){
	    if(this.edge.skipped){
		heads.push(this.head(this.edge.node1, 'left'));
	    }else{
		heads.push(this._head(this.edge.node1, 'down'));
	    }
	}else if(_in(['forward','both'],dir)){
	    if(this.edge.skipped){
		heads.push(this._head(this.edge.node1, 'left'));
	    }else{
		heads.push(this._head(this.edge.node1, 'up'));
	    }
	}
    }
    if(_in(['forward','both'],this.edge.dir)){
	if(_in(['right-up','right','right-down'],dir)){
	    heads.push(this._head(this.edge.node2, 'right'));
	}else if(dir == 'up'){
	    heads.push(this._head(this.edge.node2, 'up'));
	}else if(_in(['left-up','left','left-down','down','same'],dir)){
	    heads.push(this._head(this.edge.node2, 'down'));
	}
    }
    return heads;
};
LandscapeEdgeMetrix.prototype.shaft = function(){
    var span = new XY(this.metrix.spanWidth, this.metrix.spanHeight);
    var dir = this.direction();
    var node1 = this.metrix.node(this.edge.node1);
    var cell1 = this.metrix.cell(this.edge.node1);
    var node2 = this.metrix.node(this.edge.node2);
    var cell2 = this.metrix.cell(this.edge.node2);
    
    var shaft = new EdgeLines(this.metrix);
    
    //console.log("dir",dir,this.edge);

    if(dir == 'right'){
	shaft.moveTo(node1.right());
	
	if(this.edge.skipped){
	    shaft.lineTo(cell1.right().x + span.x / 2, cell1.right().y);
	    shaft.lineTo(cell1.right().x + span.x / 2, cell1.bottomRight().y + span.y / 2);
	    shaft.lineTo(cell2.left().x - span.x / 4, cell2.bottomRight().y + span.y/2);
	    shaft.lineTo(cell2.left().x - span.x / 4, cell2.left().y);
	}
	shaft.lineTo(node2.left());
    }else if(dir == 'right-up'){
	shaft.moveTo(node1.right());
	
	if(this.edge.skipped){
	    shaft.lineTo(cell1.right().x + span.x / 2, cell1.right().y);
	    shaft.lineTo(cell1.right().x + span.x / 2, cell2.bottomLeft().y + span.y / 2);
	    shaft.lineTo(cell2.left().x - span.x / 4, cell2.bottomLeft().y + span.y / 2);
	    shaft.lineTo(cell2.left().x - span.x / 4, cell2.left().y);
	}else{
	    shaft.lineTo(cell2.left().x - span.x/4, cell1.right().y);
	    shaft.lineTo(cell2.left().x - span.x/4, cell2.left().y);
	}
	shaft.lineTo(node2.left());
    }else if(dir == 'right-down'){
	shaft.moveTo(node1.right());
	shaft.lineTo(cell1.right().x + span.x / 2, cell1.right().y);
	
	if(this.edge.skipped){
	    shaft.lineTo(cell1.right().x + span.x / 2, cell2.topLeft().y - span.y / 2);
	    shaft.lineTo(cell2.left().x - span.x / 4, cell2.topLeft().y - span.y / 2);
	    shaft.lineTo(cell2.left().x - span.x / 4, cell2.left().y);
	}else{
	    shaft.lineTo(cell1.right().x + span.x / 2, cell2.left().y);
	}
	shaft.lineTo(node2.left());
    }else if(dir == 'up'){
	if(this.edge.skipped){
	    shaft.moveTo(node1.right());
	    shaft.lineTo(cell1.right().x + span.x / 4, cell1.right().y);
	    shaft.lineTo(cell1.right().x + span.x / 4, cell2.bottom().y + span.y / 2);
	    shaft.lineTo(cell2.bottom().x - span.x / 4, cell2.bottom().y + span.y / 2);
	}else{
	    shaft.moveTo(node1.top());
	}
	shaft.lineTo(node2.bottom());
    }else if(_in(['left-up','left','same'],dir)){
	shaft.moveTo(node1.right());
	shaft.lineTo(cell1.right().x + span.x / 4, cell1.right().y);
	shaft.lineTo(cell1.right().x + span.x /4, cell2.top().y - span.y / 2 + span.y / 8);
	shaft.lineTo(cell2.top().x, cell2.top().y - span.y / 2 + span.y / 8);
	shaft.lineTo(node2.top());
    }else if(dir == 'left-down'){
	if(this.edge.skipped){
	    shaft.moveTo(node1.right());
	    shaft.lineTo(cell1.right().x + span.x / 2, cell1.right().y);
	    shaft.lineTo(cell1.right().x + span.x / 2, cell2.top().y - span.y / 2);
	    shaft.lineTo(cell2.top().x, cell2.top().y - span.y / 2);
	}else{
	    shaft.moveTo(node1.bottom());
	    shaft.lineTo(cell1.bottom().x, cell2.top().y - span.y / 2);
	    shaft.lineTo(cell2.top().x, cell2.top().y - span.y / 2);
	}
	shaft.lineTo(node2.top());
    }else if(dir == 'down'){
	if(this.edge.skipped){
	    shaft.moveTo(node1.right());
	    shaft.lineTo(cell1.right().x + span.x / 2, cell1.right().y);
	    shaft.lineTo(cell1.right().x + span.x / 2, cell2.top().y - span.y / 2 + span.y / 8);
	    shaft.lineTo(cell2.top().x, cell2.top().y - span.y/2 + span.y / 8);
	}else{
	    shaft.moveTo(node1.bottom());
	}
	shaft.lineTo(node2.top());
    }
    return shaft;
};
LandscapeEdgeMetrix.prototype.labelbox = function(){
    var span = new XY(this.metrix.spanWidth, this.metrix.spanHeight);
    var dir = this.direction();
    var node1 = this.metrix.cell(this.edge.node1);
    var node2 = this.metrix.cell(this.edge.node2);
    var box;
    if(dir == 'right'){
	if(this.edge.skipped){
	    box = [node1.bottomRight().x + span.x,
		   node1.bottomRight().y,
		   node2.bottomLeft().x - span.x,
		   node2.bottomLeft().y - span.y / 2];
	}else{
	    box = [node1.topRight().x,
		   node1.topRight().y - span.y /8,
		   node2.left().x,
		   node2.left().y - span.y /8];
	}
    }else if(dir == 'right-up'){
	box = [node2.left().x - span.x,
	       node2.left().y,
	       node2.bottomLeft().x,
	       node2.bottomLeft().y];
    }else if(dir == 'right-down'){
	box = [node1.right().x,
	       node2.topLeft().y - span.y / 8,
	       node1.right().x + span.x,
	       node2.left().y + span.y / 8];
    }else if(_in(['up','left-up','left','same'], dir)){
	if(this.edge.node2.xy.y < this.edge.node1.xy.y){
	    box = [node1.topRight().x - span.x / 2 + span.x / 4,
		   node1.topRight().y - span.y / 2,
		   node1.topRight().x + span.x / 2 + span.x / 4,
		   node1.topRight().y]
	}else{
	    box = [node1.top().x + span.x / 4,
		   node1.top().y - span.y,
		   node1.topRight().y + span.x / 4,
		   node1.topRight().y - span.y / 2]
	}
    }else if(_in(['left-down','down'],dir)){
	box = [node2.top().x + span.x / 4,
	       node2.top().y - span.y,
	       node2.topRight().x + span.x / 4,
	       node2.topRight().y - span.y / 2];
    }
    // shrink box
    box = [box[0] + span.x / 8, box[1], box[2] - span.x / 8, box[3]];
    return box;
};


function NodeMetrix(node,metrix){
    // NodeMetrix
    this.metrix = metrix;
    this.width = node.width;
    this.height = node.height;

    //console.log(metrix);
    this.x = metrix.pageMargin.x + metrix.pagePadding[3]+
	node.xy.x * (metrix.nodeWidth + metrix.spanWidth);
    this.y = metrix.pageMargin.y + metrix.pagePadding[0] +
	node.xy.y * (metrix.nodeHeight + metrix.spanHeight);

    //console.log(metrix.pageMargin.x,metrix.pagePadding[3],node.xy.x,metrix.nodeWidth,metrix.spanWidth);
}
NodeMetrix.prototype.box = function(){
    var m  = this.metrix;
    var topLeft = this.topLeft();
    var bottomRight = this.bottomRight();

    return [topLeft.x, topLeft.y, bottomRight.x, bottomRight.y];
};
NodeMetrix.prototype.marginBox = function(){
    var m = this.metrix;
    var topLeft = this.topLeft();
    var bottomRight = this.bottomRight();

    return [topLeft.x - m.spanWidth / 8,
	    topLeft.y - m.spanHeight /4,
	    bottomRight.x + m.spanWidth / 8,
	    bottomRight.y + m.spanHeight / 4];
}
NodeMetrix.prototype.coreBox = function(){
    var m = this.metrix;
    var topLeft = this.topLeft();
    var bottomRight = this.bottomRight();
    return [topLeft.x - m.spanWidth ,
	    topLeft.y - m.spanHeight,
	    bottomRight.x + m.spanWidth * 2,
	    bottomRight.y + m.spanHeight * 2];
};
NodeMetrix.prototype.groupLabelBox = function(){
    var m = this.metrix;
    var topLeft = this.topLeft();
    var bottomRight = this.bottomRight();

    return [topLeft.x,
	    topLeft.y - m.spanHieight / 2,
	    bottomRight.x,
	    bottomRight.y];
};
NodeMetrix.prototype._nodeWidth = function(){
    var m = this.metrix;
    return this.width * m.nodeWidth + (this.width - 1)* m.spanWidth;
}
NodeMetrix.prototype._nodeHeight = function(){
    var m = this.metrix;
    return this.height * m.nodeHeight + (this.height - 1)* m.spanHeight;
}
NodeMetrix.prototype.topLeft = function(){
    return new XY(this.x, this.y);
}
NodeMetrix.prototype.topCenter = function(){
    return new XY(this.x + this._nodeWidth()/2, this.y);
}
NodeMetrix.prototype.topRight = function(){
    return new XY(this.x + this._nodeWidth(), this.y);
}
NodeMetrix.prototype.bottomLeft = function(){
    return new XY(this.x, this.y + this._nodeHeight());
}
NodeMetrix.prototype.bottomCenter = function(){
    return new XY(this.x + this._nodeWidth()/2, this.y + this._nodeHeight());
}
NodeMetrix.prototype.bottomRight = function(){
    return new XY(this.x + this._nodeWidth(), this.y + this._nodeHeight());
}
NodeMetrix.prototype.leftCenter = function(){
    return new XY(this.x, this.y + this._nodeHeight()/2);
}
NodeMetrix.prototype.rightCenter = function(){
    return new XY(this.x + this._nodeWidth(), this.y + this._nodeHeight()/2);
}
NodeMetrix.prototype.center = function(){
    return new XY(this.x + this._nodeWidth()/2, this.y + this._nodeHeight()/2);
}
NodeMetrix.prototype.top = function(){
    return this.topCenter();
}
NodeMetrix.prototype.bottom = function(){
    return this.bottomCenter();
}
NodeMetrix.prototype.right = function(){
    return this.rightCenter();
}
NodeMetrix.prototype.left = function(){
    return this.leftCenter();
};

function DiagramLayoutManager(diagram){
    this.diagram = diagram;
    this.circulars = [];
    this.heightRefs = [];
    this.coordinates = [];
}
DiagramLayoutManager.prototype.run = function(){
    if(this.diagram instanceof Diagram){
	var ls = this.diagram.traverse_groups();
	for(var i = 0;i < ls.length ; i++){
	    (new DiagramLayoutManager(ls[i])).run(); // class?
	}
    }
    this.edges = DiagramEdge.find_by_level(this.diagram.level);
    this.do_layout();

    this.diagram.fixiate();
    if(this.diagram.orientation == 'portrait'){
	this.rotate_diagram();
    }

}
DiagramLayoutManager.prototype.rotate_diagram = function(){
    var ls = this.diagram.traverse_nodes();
    var node;

    for(var i = 0; i< ls.length; i++){
	node = ls[i];
	node.xy = new XY(node.xy.y, node.xy.x);
	node.width = node.height;
	node.height = node.width;
	if(node instanceof NodeGroup){
	    if(node.orientation == "portrait"){
		node.orientation = 'landscape';
	    }else{
		node.orientation = 'portrait';
	    }
	}
    }
    var xy = [this.diagram.height, this.diagram.width]; // swap
    this.diagram.width = xy[0];
    this.diagram.height = xy[1];

}
DiagramLayoutManager.prototype.do_layout = function(){
    try{
	//console.log("DIAGRAM",this.diagram.edges[0].node1.id,this.diagram.edges[0].node2.id);
    }catch(e){
	
    }
    //console.log("DIA",this.diagram)
    this.detect_circulars();
    this.set_node_width();
    this.adjust_node_order();

    var height = 0;
    var toplevel_nodes = [];
    for(var i = 0; i< this.diagram.nodes.length; i++){
	if(this.diagram.nodes[i].xy.x == 0){
	    toplevel_nodes.push(this.diagram.nodes[i]);
	}
    }

    var node;
    var max;
    for(var i = 0; i < this.diagram.nodes.length; i++){
	node = this.diagram.nodes[i];
	if(node.xy.x == 0){
	    this.set_node_height(node, height);
	    //console.log("Height",node.id,height);
	    //this.set_node_height(node, 0);
	    max = 0;
	    for(var j = 0; j< this.coordinates.length; j++){
		max = Math.max(max, this.coordinates[j].y);
	    }
	    height = max + 1;
	}
    }
};
DiagramLayoutManager.prototype.get_related_nodes = function(node,parent,child){
    var uniq = {};
    var edge;
    var tbl = {};
    for(var i = 0; i < this.edges.length; i ++){
	edge = this.edges[i];
	if(edge.folded){
	    continue;
	}
	if(parent && edge.node2 == node){
	    uniq[edge.node1] = 1;
	    tbl[edge.node1] = edge.node1;
	}else if(child && edge.node1 == node){
	    uniq[edge.node2] = 1;
	    tbl[edge.node2] = edge.node2;
	}
    }
    var related = [];
    for(var uniq_node in uniq){
	if(uniq_node == node + ""){   // uuid?
	    //
	}else if(tbl[uniq_node].group != node.group){
	    //
	}else{
	    related.push(tbl[uniq_node]); // todo: ERROR ??? -> fix?
	}
    }
    related.sort(function(x,y){return +x.order - y.order});
    return related;
}
DiagramLayoutManager.prototype.get_parent_nodes = function(node){
    return this.get_related_nodes(node,true);
}
DiagramLayoutManager.prototype.get_child_nodes = function(node){
    return this.get_related_nodes(node,false,true);
}
DiagramLayoutManager.prototype.detect_circulars = function(){
    var node,c1,c2;
    var flag;
    for(var i = 0; i < this.diagram.nodes.length; i++){
	node = this.diagram.nodes[i];
	flag = false;
	for(var j = 0; j < this.circulars.length; j++){
	    if(_in(this.circulars[j],node)){
		flag = true;
		break;
	    }
	}
	if(!flag){
	    this.detect_circulars_sub(node,[node]);
	}
    }
    //remove part of other circular
    var tmp = this.circulars.slice();
    for(var i = 0; i < tmp.length; i++){
	c1 = tmp[i];
	for(var j = 0; j < this.circulars.length; j++){
	    c2 = this.circulars[j];
	    intersect = (new Set(c1)).intersect(new Set(c2)) ; //todo: c1 && c2
	    
	    if(!_equal(c1,c2) && (new Set(c1)).equal(intersect)){ // todo: set 
		if(_in(this.circulars,c1)){ //todo:set
		    this.circulars = _remove(this.circulars,c1); // todo:set
		    break;
		}
	    }
	    if(!_equal(c1,c2) && intersect.data.length > 0){ //todo:set 
		if(_in(this.circulars,c1)){ // todo:set 
		    this.circulars = _remove(this.circulars, c1); // todo:set
		}
		this.circulars = _remove(this.circulars, c2); //todo:set
		this.circulars.push(c1.concat(c2));  // todo:set??
		break;
	    }
	}
    }
}
 
DiagramLayoutManager.prototype.detect_circulars_sub = function(node,parents){
    var ls = this.get_child_nodes(node);
    var child,n;
    for(var i=0 ; i<ls.length; i++){
	child = ls[i];
	if(_in(parents,child)){
	    var n = _index(parents,child);
	    this.circulars.push(parents.slice(n));
	}else{
	    this.detect_circulars_sub(child,parents.concat([child]));
	}
    }
};
DiagramLayoutManager.prototype.is_circular_ref = function(node1, node2){
    var circular,parent,ls,parents,node,children;
    for(var i = 0; i < this.circulars.length; i++){
	circular = this.circulars[i];
	if(_in(circular,node1) && _in(circular,node2)){
	    parents = [];
	    
	    for(var j = 0; j < circular.length; j++){
		node = circular[j];
		ls = this.get_parent_nodes(node);
		for(var k = 0; k < ls.length; k++){
		    parent = ls[k];
		    if(!_in(circular,parent)){
			parents.push(parent);
		    }
		}
	    }
	    parents.sort(function(x,y){return x.order - y.order;});
	    //console.log(parents)
	    for(var j = 0;j < parents.length;j++){
		parent = parents[j];
		children = this.get_child_nodes(parent);
		if(_in(children,node1) && _in(children,node2)){
		    if(_index(circular,node1) > _index(circular,node2)){
			console.log("C1");
			return true;
		    }
		}else if(_in(children,node2)){
		    console.log("C2");
		    return true;
		}else if(_in(children,node1)){
		    return false;
		}
	    }
	    if(parents.length == 0){
		if(_index(circular,node1) > _index(circular,node2)){
		    console.log("C3");
		    return true;
		}
	    }
	}
    }
    return false;
};
DiagramLayoutManager.prototype.set_node_width = function(depth){
    var node,child,ls;
    //console.log(depth)
    if(depth>10)throw "error";
    if(depth == undefined)depth = 0;
    for(var i = 0; i< this.diagram.nodes.length; i++){
	node = this.diagram.nodes[i];
	if(node.xy.x != depth){
	    continue;
	}
	ls = this.get_child_nodes(node);
	//console.log('CHILD',node,ls,depth,node.xy);
	for(var j = 0; j < ls.length; j++){
	    child = ls[j];
	    if(this.is_circular_ref(node,child)){
		//
	    }else if(node == child){
		//
	    }else if(child.xy.x > node.xy.x + node.width){
		//
	    }else{
		//console.log("MOVE",child,node.xy.x,node.width,typeof(node.width))
		child.xy = new XY(node.xy.x + node.width, 0);
	    }
	}
    }

    var depther_node = [];
    for(var i = 0; i < this.diagram.nodes.length; i++){
	if(this.diagram.nodes[i].xy.x > depth){
	    depther_node.push(this.diagram.nodes[i]);
	}
    }

    if(depther_node.length > 0){
	this.set_node_width(depth + 1);
    }
}
DiagramLayoutManager.prototype.adjust_node_order = function(){
    var node,parents,node1,node2;
    var idx1,idx2,children;
    var ls = this.diagram.nodes.slice();
    for(var i = 0; i < ls.length; i ++){
	node = ls[i];
	parents = this.get_parent_nodes(node);
	if((new Set(parents)).data.length > 1){  // todo: set
	    for(var j = 1; j < parents.length; j++){
		node1 = parents[j - 1];
		node2 = parents[j];
		
		if(node1.xy.x == node2.xy.x){
		    idx1 = _index(this.diagram.nodes,node1);
		    idx2 = _index(this.diagram.nodes,node2);

		    if(idx1 < idx2){

			this.diagram.nodes = _remove(this.diagram.nodes,node2);
			//this.diagram.nodes.insert(idx1+1,node2)
			this.diagram.nodes.splice(idx1+1,0,node2);

		    }else{
			this.diagram.nodes = _remove(this.diagram.nodes,node1);
			//this.diagram.nodes.insert(idx2+1,node1)
			this.diagram.nodes.splice(idx2+1,0,node1);			
		    }

		}
	    }
	}
	children = this.get_child_nodes(node);
	if((new Set(children)).data.length > 1){ // todo: set
	    for(var j = 1; j < children.length;j ++){
		node1 = children[j -1];
		node2 = children[j];

		idx1 = _index(this.diagram.nodes,node1);
		idx2 = _index(this.diagram.nodes,node2);
		if(node1.xy.x == node2.xy.x){
		    if(idx1 < idx2){
			this.diagram.nodes = _remove(this.diagram.nodes,node2);
			//this.diagram.nodes.insert(idx1 + 1,node2);
			this.diagram.nodes.splice(idx1 + 1,0,node2);
		    }else{
			this.diagram.nodes = _remove(this.diagram.nodes,node1);
			//this.diagram.nodes.insert(idx2 + 1,node1);
			this.diagram.nodes.splice(idx2 + 1,0,node1);
		    }
		}else if(this.is_circular_ref(node1,node2)){
		    //
		}else{
		    if(node1.xy.x < node2.xy.x){
			this.diagram.nodes = _remove(this.diagram.nodes,node2);
			//this.diagram.nodes.insert(idx1 + 1, node2);
			this.diagram.nodes.splice(idx1 + 1,0, node2);
		    }else{
			this.diagram.nodes = _remove(this.diagram.nodes,node1);
			//this.diagram.nodes.insert(idx2 + 1, node1);
			this.diagram.nodes.splice(idx2 + 1,0, node1);
		    }
		}
	    }
	}
	if(node instanceof NodeGroup){
	    children = this.get_child_nodes(node);
	    if((new Set(children)).data.length > 1){ // todo: set
		var exchange;
		while(true){
		    exchange = 0;
		    for(var j = 1; j < children.length; j ++){
			node1 = children[j - 1];
			node2 = children[j];
			
			idx1 = _index(this.diagram.nodes,node1);
			idx2 = _index(this.diagram.nodes,node2);
			ret = this.compare_child_node_order(node,node1,node2);
			if(ret < 0 && idx1 < idx2){
			    this.diagram.nodes = _remove(this.diagram.nodes,node1);
			    //this.diagram.nodes.insert(idx2 + 1,node1);
			    this.diagram.nodes.splice(idx2 + 1,0,node1);
			    exchance += 1;
			}
		    }
		    if(exchange == 0){break;}
		}
	    }
	}
    }
    this.diagram.update_order();
};
DiagramLayoutManager.prototype.compare_child_node_order = function(parent,node1,node2){
    function compare(x,y){
	var x = x.duplicate(); // todo: error
	var y = y.duplicate(); // todo: error
	while(x.node1 == y.node1 && x.node1.group != null){
	    x.node1 = x.node1.group;
	    y.node1 = y.node1.group;
	}
	return (x.node1.order - y.node1.order);
    }
    var edges = DiagramEdge.find(parent, node1)
    .concat(DiagramEdge.find(parent,node2));
    edges.sort(compare);
    if(edges.length == 0){return 0;}
    else if(edges[0].node2 == node1){return 1;}
    else{return -1;}
};
DiagramLayoutManager.prototype.mark_xy = function(xy, width, height){
    for(var w = 0; w < width; w ++){
	for(var h = 0; h < height; h ++){
	    this.coordinates.push(new XY(xy.x + w, xy.y + h));
	}
    }
};
DiagramLayoutManager.prototype.set_node_height = function(node, height){
    if(height == undefined) height = 0;
    var xy = new XY(node.xy.x, height);
    if(_in(this.coordinates,xy)){  // todo: error cannnot equal? = fix?
	return false;
     }
    node.xy = xy;
    this.mark_xy(node.xy, node.width, node.height);
    
    var count = 0;
    var children = this.get_child_nodes(node);
    //children.sort(function(x,y){return x.xy.x - y.xy.y});  //??? todo: 
    //console.log("children",children)
    //throw "stop";
    var grandchild = 0;
    var child;
    for(var i = 0; i < children.length; i++){
	child = children[i];
	if(this.get_child_nodes(child).length != 0){
	    grandchild += 1;
	}
    }
    var prev_child = null;
    for(var i = 0; i < children.length; i++){
	child = children[i];
	if(_in(this.heightRefs, child.id)){
	    //
	}else if(node.xy.x >= child.xy.x){
	    //
	}else{
	    var height;
	    if(node instanceof NodeGroup){
		var parent_height = this.get_parent_node_height(node, child);
		if(parent_height && parent_height > height){
		    height = parent_height;
		}
	    }
	    if(prev_child && grandchild > 1 && !this.is_rhombus(prev_child, child)){
		var coord = [];
		var max = 0;
		for(var j = 0; j < this.coordinates.length; j++){
		    if(this.coordinates[j].x > child.xy.x){
			coord.push(this.coordinates[j].y);
			max = Math.max(max, this.coordinates[j].y);
		    }
		}
		if(coord.length != 0){
		    height = max + 1;
		}
	    }
	    while(true){
		if(this.set_node_height(child, height)){
		    child.xy = new XY(child.xy.x, height);
		    this.mark_xy(child.xy, child.width, child.height);
		    this.heightRefs.push(child.id);

		    count += 1;
		    break;
		}else{
		    if(count == 0){return false;}
		    height += 1;
		}
	    }
	    height += 1;
	    prev_child = child;
	}
    }
    return true;
};
DiagramLayoutManager.prototype.is_rhombus = function(node1, node2){
    var ret = false;
    var child1,child2;
    while(true){
	if(node1 == node2){
	    ret  = true;
	    break;
	}
	child1 = this.get_child_nodes(node1);
	child2 = this.get_child_nodes(node2);

	if(child1.length != 1 || child2.length != 1){break;}
	else if(node1.xy.x > child1[0].xy.x || node2.xy.x > child2[0].xy.x){break;}
	else{
	    node1 = child1[0];
	    node2 = child2[0];
	}
    }
    return ret;
};
DiagramLayoutManager.prototype.get_parent_node_height = function(parent, child){
    var heights = [];
    var ls = DiagramEdge.find(parent, child);
    var e,y,node;
    var min = 100000; // todo: big number
    for(var i = 0; i < ls.length; i++){
	e = ls[i];
	y = parent.xy.y;
	node =  e.node1;
	while(node != parent){
	    y += node.xy.y;
	    node = node.group;
	}
	heights.push(y);
	min = Math.min(min, y);
    }
    if(heights.length != 0){
	return min
    }else{
	return null;
    }
};

function init(){
    //
    $('log').innerHTML = "load ok";
    //var l = parse("hello b { b[a ='abc',hel]->a;aaa->bbb;ddd{}}",action);
    var s = "diagram a {A,a->B[hel=a,bb=b];C->D;}";
    s = "diagram a{A->B;group bbb {B->C;}}";
    //s = "diagram a{A->A,B;aaa=bbb;A->B}";
    //s = "diagram a{A->B;A=b}";
    //s = "diagram a{aa [b=cc,vv=zz]}";
    s = "diagram a{A[stacked];A->B->C;}";
    //s = "diagram a{A->B,D;D->C;}";

    function draw(s){
	action.init();
	var l = parse(s,action);
	console.log("PARSE OK:" + l.full);
	console.log(action.out);
	var out = ScreenNodeBuilder.build(action.out);
	console.log(out);
	console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@");
	DiagramDraw.setMetrixClass(DiagramMetrix);
	dd = new DiagramDraw("",out);
	dd.draw();
    }
    var cache = "";
    $('src').onkeydown = function(){
	setTimeout(function(){
		if(cache != $('src').value){
		    draw($('src').value);
		}
		cache = $('src').value;
	    },500);
    }
    draw($('src').value);
}

