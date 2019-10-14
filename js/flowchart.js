var flowchart;
(function(){
    // inner
    
function parse(s,action){
    action.init();
    var parser = new Gin.Grammar({
	    block:/"{":beginBlock (sentence:pushIf)* "}":endBlock/,
	    sentence:/((("if":beginIf "\(" id:pushIfv "\)" block:pushIf ) (("else" "\(" id:pushIfv "\)" block:pushIf )|"")):endIf|("loop":beginLoop "\(" id:pushIfv "\)" block:pushIf):endLoop|id:push)/,
	    //id:/<[A-Za-z_\u0080-\uffff][A-Za-z_0-9\u0080-\uffff]*>/
	    id:/<[0-9a-zA-Z\u0080-\uffff]+>/
	},"block", new Gin.Parser.RegExp(/[ \r\n]/));
    return parser.parse(s,action);
}
var action = {
    stack:[],
    block:[],
    ifBlock:[],
    init:function(){
	action.stack = [];
	action.ifBlock = [];
	action.block = [];
    },
    push:function(v){
	action.stack.push(["id", v + ""]);
    },
    complete:function(v){
    },
    pushIf:function(v){
	var t = action.stack.pop();
	var ifBlock = action.stack.pop();
	ifBlock.push(t);
	action.stack.push(ifBlock);
    },
    pushIfv:function(v){
	var ifBlock = action.stack.pop();
	ifBlock.push(["id",v]);
	action.stack.push(ifBlock);
    },
    beginBlock:function(){
	action.stack.push(["block"]); // block
    },
    endBlock:function(){
	
    },
    beginIf:function(){
	action.stack.push(["if"]); // if block
    },
    endIf:function(){

    },
    beginLoop:function(){
	action.stack.push(["loop"]); // loop block
    },
    endLoop:function(){

    }
};    

var  _uid = 0;
function getUid(){
    return "uid" + (_uid++);
}

var start;
var labels = [];
var conns = [];
var parents = [];
var retHead = null;
var retFoot = null;


function decode(parsed){
    var i;
    var uid,uid2;
    var tmp;
    var prev;
    switch(parsed[0]){
    case 'block':
	// parents --> block head
	tmp = parents[parents.length - 1]; // 親を取り出す
	if(parsed.length > 1){ // 空のブロックではない
	    for(i = 1; i < parsed.length; i++){ // ブロック内
		decode(parsed[i]); // 更に解釈
		if(i==1){ // はじめだけ
		    conns.push([tmp[0],retHead,tmp[1]]); // 解釈した奴の頭につなげる
		}else{ //始め以外
		    conns.push([prev,retHead,""]);  // 前のやつのおしりと解釈した奴のあたま
		}
		// prev->next
		prev = retFoot; // いまのやつのしっぽ
	    }
	    parents.push([prev,""]); // 次のブロックに親を伝える
	}else{
	    parents.push(tmp); // 次のブロックに親を伝える（今の親を複製）
	}	
	break;
    case 'if':
	uid = getUid();
	labels.push([uid,'IF']);
	uid2 = getUid();
	labels.push([uid2,'END IF']);

	for(i = 2; i < parsed.length; i+=2){
	    parents.push([uid, parsed[i-1][1]]); // IFにつなげてね（親登録）
	    decode(parsed[i]); // BLOCK構築
	    tmp = parents.pop(); // 親を取り出す
	    conns.push([tmp[0],uid2,tmp[1]]); //親とENDIFをつなげる
	    parents.pop();  // 親指定を一旦解除
	}
	retFoot = uid2; // この要素の先頭 
	retHead = uid;  // この要素の末尾
	break;
    case 'loop':
	// 条件
	uid = getUid();
	labels.push([uid,'LOOP:' + parsed[1][1]]);
	uid2 = getUid();
	labels.push([uid2,'END LOOP']);

	conns.push([uid2,uid,'']);
	
	parents.push([uid, '']); // LOOPにつなげてね（親登録）
	decode(parsed[2]); // LOOP BODY
	tmp = parents.pop(); // 親を取り出す
	conns.push([tmp[0],uid2,tmp[1]]); //親とENDLOOPをつなげる
	parents.pop();  // 親指定を一旦解除	

	retFoot = uid2; // この要素の先頭 
	retHead = uid;  // この要素の末尾	
	break;
    case 'id':
	uid = getUid();
	labels.push([uid,parsed[1]]); 
	retFoot = uid; // この要素の先頭
	retHead = uid; // この要素の末尾
	break;
    default:
	console.log("error" + parsed[0]);
	break;
    }

}

flowchart = function(s){
    var out = parse(s,action);    
    labels = [];
    conns = [];
    parents = [];
    start = getUid();
    labels.push([start,"START"]);

    //parents.push([start,'']);
    parents.push([start,'']);
    
    decode(action.stack[0]);

    console.log(conns);

    var i;
    var sout = "";
    for(i = 0; i < labels.length; i++){
	sout += labels[i][0] + '[label="' + labels[i][1]+ '"];\n';
    }

    for(i = 0; i < conns.length; i++){
	sout += conns[i][0] + ' -> ' + conns[i][1]  + ' [label="' + conns[i][2] + '"]'+ ';\n';
    }
    //console.log(sout);
    return "diagram{\n" + "orientation=portrait;\n" + sout + "\n}";
};
})();


function init(){
    //
    $('log').innerHTML = "load ok";
    function draw(s){
	action.init();
	var l = parse(flowchart(s),action);
	//console.log("PARSE OK:" + l.full);
	//console.log(action.out);
	var out = ScreenNodeBuilder.build(action.out);
	//console.log(out);
	//console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@");
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