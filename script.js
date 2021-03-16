var lineBreakRegex=/\r?\n/g;
var itemSeparatorRegex=/[\t ,]/g;
window.onload=function (){
  console.clear();
  dg('input').onkeydown=handlekey;
  dg('input').onfocus=handlekey;
  dg('input').onmousedown=handlekey;
  load();
  compute();
}
function dg(s){
  return document.getElementById(s);
}

function occurrences(string, subString, allowOverlapping) {
  string+="";
  subString+="";
  if (subString.length<=0)return string.length+1;
  var n=0,
  pos=0,
  step=allowOverlapping?1:subString.length;
  while (true){
    pos=string.indexOf(subString,pos);
    if (pos>=0){
      ++n;
      pos+=step;
    }else break;
  }
  return n;
}
function isMatchingParens(s){
  return occurrences(s,"{")==occurrences(s,"}")
    &&occurrences(s,"[")==occurrences(s,"]")
    &&occurrences(s,"(")==occurrences(s,")");
}
function normalizeAbbreviations(s){
  return Term(s)+"";
}
function abbreviate(s){
  return Term(s).toString(true);
}

function Term(s){
  if (s instanceof Term) return s.clone();
  else if (typeof s!="undefined"&&typeof s!="string") throw Error("Invalid expression: "+s);
  if (s) return Term.build(s);
  else return this;
}
Term.build=function (s){
  if (s instanceof Term) return s.clone();
  if (!isMatchingParens(s)) throw Error("Invalid expression: "+s);
  var strin=s;
  if (s=="") return NullTerm.build();
  if (s=="0") return ZeroTerm.build();
  if (s=="1") return OneTerm.build();
  //s=normalizeAbbreviations(s);
  if (!/^[AE_\(\)\[\]{}0-9εω\+×]+$/.test(s)) throw Error("Invalid expression: "+strin);
  var nums="0123456789";
  var alphas="abcdefghij";
  function numToAlpha(n){
    n=n+"";
    for (var i=0;i<10;i++){
      n=n.replaceAll(nums[i],alphas[i]);
    }
    return "<"+n+">";
  }
  function alphaToNum(s){
    if (s[0]!="<"||s[s.length-1]!=">") throw Error("F");
    s=s.slice(1,-1);
    for (var i=0;i<10;i++){
      s=s.replaceAll(alphas[i],nums[i]);
    }
    return +s;
  }
  var subterms=[];
  function newSubterm(t){
    subterms.push(t);
    return numToAlpha(subterms.length-1);
  }
  function getSubterm(n){
    return subterms[alphaToNum(n)];
  }
  s=s.replace(/[0-9]+/g,function (n){return +n<2?n:"{1"+"+1".repeat(+n-1)+"}";});
  while (true){
    var manipulated=false;
    if (s.indexOf("ω")!=-1){ //ω
      manipulated=true;
      s=s.replaceAll("ω",newSubterm(Term("EE_{E(ε([A])×(1))}(0)")));
    }
    if (/A(?!_)/.test(s)){ //A
      manipulated=true;
      s=s.replace(/A(?!_)/g,newSubterm(Term("E(ε(0)×(1))")));
    }
    if (s.indexOf("0")!=-1){ //0
      manipulated=true;
      s=s.replaceAll("0",newSubterm(ZeroTerm.build()));
    }
    if (s.indexOf("1")!=-1){ //1
      manipulated=true;
      s=s.replaceAll("1",newSubterm(OneTerm.build()));
    }
    if (/{<[a-j]+>}/.test(s)){ //{#}->#
      manipulated=true;
      s=s.replace(/{<[a-j]+>}/g,function (s){return s.slice(1,-1);});
    }
    if (/A_<[a-j]+>/.test(s)){ //A_#->E(ε(0)×(#))
      manipulated=true;
      s=s.replace(/A_<[a-j]+>/g,function (s){return "E(ε(0)×("+s.slice(2)+"))"});
    }
    if (/ε\(<[a-j]+>\)/.test(s)){ //ε(#)->#
      manipulated=true;
      s=s.replace(/ε\(<[a-j]+>\)/g,function (s){return newSubterm(SmallEpsilonTerm.build(getSubterm(s.slice(2,-1))));});
    }
    if (/ε\(\[<[a-j]+>\]\)/.test(s)){ //ε([#])->#
      manipulated=true;
      s=s.replace(/ε\(\[<[a-j]+>\]\)/g,function (s){return newSubterm(SmallEpsilonBracketTerm.build(getSubterm(s.slice(3,-2))));});
    }
    if (/E\(<[a-j]+>\)/.test(s)){ //E(#)->#
      manipulated=true;
      s=s.replace(/E\(<[a-j]+>\)/g,function (s){return newSubterm(CapitalEpsilonTerm.build(getSubterm(s.slice(2,-1))));});
    }
    if (/EE_<[a-j]+>\(<[a-j]+>\)/.test(s)){ //EE_#(#)->#
      manipulated=true;
      s=s.replace(/EE_<[a-j]+>\(<[a-j]+>\)/g,function (s){return newSubterm(DoubleCapitalEpsilonTerm.build(getSubterm(s.slice(3,s.indexOf("("))),getSubterm(s.slice(s.indexOf("(")+1,-1))));});
    }
    if (/<[a-j]+>×\(<[a-j]+>\)/.test(s)){ //#×(#)->#
      manipulated=true;
      s=s.replace(/<[a-j]+>×\(<[a-j]+>\)/g,function (s){return newSubterm(ProductTerm.build(getSubterm(s.slice(0,s.indexOf("×"))),getSubterm(s.slice(s.indexOf("(")+1,-1))));});
    }
    if (/<[a-j]+>(\+<[a-j]+>)+(?!×)/.test(s)){ //#+#+...+#->#
      manipulated=true;
      s=s.replace(/<[a-j]+>(\+<[a-j]+>)+(?!×)/g,function (s){return newSubterm(SumTerm.build(s.split("+").map(getSubterm)));});
    }
    if (/^<[a-j]+>$/.test(s)) break;
    if (!manipulated) throw Error("Error parsing expression: "+strin);
  }
  return getSubterm(s);
}
Term.prototype.clone=function (){
  throw Error("Cloning undefined for this term type.");
}
Term.clone=function (x){
  return x.clone();
}
Term.prototype.toString=function (abbreviate){
  throw Error("Stringification undefined for this term type.");
}
Term.prototype.toStringWithImplicitBrace=function (abbreviate){
  return this.toString(abbreviate);
}
Term.prototype.equal=function (other){
  throw Error("Equality undefined for this term type.");
}
Term.equal=function (x,y){
  if (!(x instanceof Term)) x=Term(x);
  x.equal(y);
}
Object.defineProperty(Term.prototype,"constructor",{
  value:Term,
  enumerable:false,
  writable:true
});

function NullTerm(s){
  if (s instanceof NullTerm) return s.clone();
  else if (s instanceof Term&&typeof s!="string") throw Error("Invalid expression: "+s);
  if (!(this instanceof NullTerm)) return new NullTerm(s);
  var r=Term.call(this,s);
  if (s&&!(r instanceof NullTerm)) throw Error("Invalid expression: "+s);
  if (s) return r;
}
Object.assign(NullTerm,Term);
NullTerm.build=function (){
  var r=NullTerm();
  return r;
}
NullTerm.prototype=Object.create(Term.prototype);
NullTerm.prototype.clone=function (){
  return NullTerm.build();
}
NullTerm.prototype.toString=function (abbreviate){
  return "";
}
NullTerm.prototype.equal=function (other){
  if (!(other instanceof Term)) other=Term(other);
  return other instanceof NullTerm;
}
Object.defineProperty(NullTerm.prototype,"constructor",{
  value:NullTerm,
  enumerable:false,
  writable:true
});

function ZeroTerm(s){
  if (s instanceof ZeroTerm) return s.clone();
  else if (s instanceof Term&&typeof s!="string") throw Error("Invalid expression: "+s);
  if (!(this instanceof ZeroTerm)) return new ZeroTerm(s);
  var r=Term.call(this,s);
  if (s&&!(r instanceof ZeroTerm)) throw Error("Invalid expression: "+s);
  if (s) return r;
}
Object.assign(ZeroTerm,Term);
ZeroTerm.build=function (){
  var r=ZeroTerm();
  return r;
}
ZeroTerm.prototype=Object.create(Term.prototype);
ZeroTerm.prototype.clone=function (){
  return ZeroTerm.build();
}
ZeroTerm.prototype.toString=function (abbreviate){
  return "0";
}
ZeroTerm.prototype.equal=function (other){
  if (!(other instanceof Term)) other=Term(other);
  return other instanceof ZeroTerm;
}
Object.defineProperty(ZeroTerm.prototype,"constructor",{
  value:ZeroTerm,
  enumerable:false,
  writable:true
});

function OneTerm(s){
  if (s instanceof OneTerm) return s.clone();
  else if (s instanceof Term&&typeof s!="string") throw Error("Invalid expression: "+s);
  if (!(this instanceof OneTerm)) return new OneTerm(s);
  var r=Term.call(this,s);
  if (s&&!(r instanceof OneTerm)) throw Error("Invalid expression: "+s);
  if (s) return r;
}
Object.assign(OneTerm,Term);
OneTerm.build=function (){
  var r=OneTerm();
  return r;
}
OneTerm.prototype=Object.create(Term.prototype);
OneTerm.prototype.clone=function (){
  return OneTerm.build();
}
OneTerm.prototype.toString=function (abbreviate){
  return "1";
}
OneTerm.prototype.equal=function (other){
  if (!(other instanceof Term)) other=Term(other);
  return other instanceof OneTerm;
}
Object.defineProperty(OneTerm.prototype,"constructor",{
  value:OneTerm,
  enumerable:false,
  writable:true
});

function SmallEpsilonTerm(s){
  if (s instanceof SmallEpsilonTerm) return s.clone();
  else if (s instanceof Term&&typeof s!="string") throw Error("Invalid expression: "+s);
  if (!(this instanceof SmallEpsilonTerm)) return new SmallEpsilonTerm(s);
  var r=Term.call(this,s);
  if (s&&!(r instanceof SmallEpsilonTerm)) throw Error("Invalid expression: "+s);
  if (s) return r;
}
Object.assign(SmallEpsilonTerm,Term);
SmallEpsilonTerm.build=function (inner){
  var r=SmallEpsilonTerm();
  r.inner=Term(inner);
  return r;
}
SmallEpsilonTerm.prototype=Object.create(Term.prototype);
SmallEpsilonTerm.prototype.clone=function (){
  return SmallEpsilonTerm.build(this.inner);
}
SmallEpsilonTerm.prototype.toString=function (abbreviate){
  return "ε("+this.inner.toString(abbreviate)+")";
}
SmallEpsilonTerm.prototype.equal=function (other){
  if (!(other instanceof Term)) other=Term(other);
  return other instanceof SmallEpsilonTerm&&this.inner.equal(other.inner);
}
Object.defineProperty(SmallEpsilonTerm.prototype,"constructor",{
  value:SmallEpsilonTerm,
  enumerable:false,
  writable:true
});

function SmallEpsilonBracketTerm(s){
  if (s instanceof SmallEpsilonBracketTerm) return s.clone();
  else if (s instanceof Term&&typeof s!="string") throw Error("Invalid expression: "+s);
  if (!(this instanceof SmallEpsilonBracketTerm)) return new SmallEpsilonBracketTerm(s);
  var r=Term.call(this,s);
  if (s&&!(r instanceof SmallEpsilonBracketTerm)) throw Error("Invalid expression: "+s);
  if (s) return r;
}
Object.assign(SmallEpsilonBracketTerm,Term);
SmallEpsilonBracketTerm.build=function (inner){
  var r=SmallEpsilonBracketTerm();
  r.inner=Term(inner);
  return r;
}
SmallEpsilonBracketTerm.prototype=Object.create(Term.prototype);
SmallEpsilonBracketTerm.prototype.clone=function (){
  return SmallEpsilonBracketTerm.build(this.inner);
}
SmallEpsilonBracketTerm.prototype.toString=function (abbreviate){
  return "ε(["+this.inner.toString(abbreviate)+"])";
}
SmallEpsilonBracketTerm.prototype.equal=function (other){
  if (!(other instanceof Term)) other=Term(other);
  return other instanceof SmallEpsilonBracketTerm&&this.inner.equal(other.inner);
}
Object.defineProperty(SmallEpsilonBracketTerm.prototype,"constructor",{
  value:SmallEpsilonBracketTerm,
  enumerable:false,
  writable:true
});

function CapitalEpsilonTerm(s){
  if (s instanceof CapitalEpsilonTerm) return s.clone();
  else if (s instanceof Term&&typeof s!="string") throw Error("Invalid expression: "+s);
  if (!(this instanceof CapitalEpsilonTerm)) return new CapitalEpsilonTerm(s);
  var r=Term.call(this,s);
  if (s&&!(r instanceof CapitalEpsilonTerm)) throw Error("Invalid expression: "+s);
  if (s) return r;
}
Object.assign(CapitalEpsilonTerm,Term);
CapitalEpsilonTerm.build=function (inner){
  var r=CapitalEpsilonTerm();
  inner=Term(inner);
  if (inner instanceof SumTerm){
    r.inner=SumTerm.build(inner.terms.map(function (s){return s instanceof ProductTerm?s.clone():ProductTerm.build(s,OneTerm.build());}));
  }else if (inner instanceof ProductTerm){
    r.inner=inner.clone();
  }else{
    r.inner=ProductTerm.build(inner,OneTerm.build());
  }
  return r;
}
CapitalEpsilonTerm.prototype=Object.create(Term.prototype);
CapitalEpsilonTerm.prototype.clone=function (){
  return CapitalEpsilonTerm.build(this.inner);
}
CapitalEpsilonTerm.prototype.toString=function (abbreviate){
  if (abbreviate&&this.inner instanceof ProductTerm&&this.inner.left instanceof SmallEpsilonTerm&&this.inner.left.inner instanceof ZeroTerm){
    if (this.inner.right instanceof OneTerm) return "A";
    else return "A_"+this.inner.right.toStringWithImplicitBrace(abbreviate);
  }else{
    return "E("+this.inner.toString(abbreviate)+")";
  }
}
CapitalEpsilonTerm.prototype.equal=function (other){
  if (!(other instanceof Term)) other=Term(other);
  return other instanceof CapitalEpsilonTerm&&this.inner.equal(other.inner);
}
Object.defineProperty(CapitalEpsilonTerm.prototype,"constructor",{
  value:CapitalEpsilonTerm,
  enumerable:false,
  writable:true
});

function DoubleCapitalEpsilonTerm(s){
  if (s instanceof DoubleCapitalEpsilonTerm) return s.clone();
  else if (s instanceof Term&&typeof s!="string") throw Error("Invalid expression: "+s);
  if (!(this instanceof DoubleCapitalEpsilonTerm)) return new DoubleCapitalEpsilonTerm(s);
  var r=Term.call(this,s);
  if (s&&!(r instanceof DoubleCapitalEpsilonTerm)) throw Error("Invalid expression: "+s);
  if (s) return r;
}
Object.assign(DoubleCapitalEpsilonTerm,Term);
DoubleCapitalEpsilonTerm.build=function (sub,inner){
  var r=DoubleCapitalEpsilonTerm();
  r.sub=Term(sub);
  r.inner=Term(inner);
  return r;
}
DoubleCapitalEpsilonTerm.prototype=Object.create(Term.prototype);
DoubleCapitalEpsilonTerm.prototype.clone=function (){
  return DoubleCapitalEpsilonTerm.build(this.sub,this.inner);
}
DoubleCapitalEpsilonTerm.prototype.toString=function (abbreviate){
  if (this.equal("ω")) return "ω";
  else return "EE_"+this.sub.toStringWithImplicitBrace(abbreviate)+"("+this.inner.toString(abbreviate)+")";
}
DoubleCapitalEpsilonTerm.prototype.equal=function (other){
  if (!(other instanceof Term)) other=Term(other);
  return other instanceof DoubleCapitalEpsilonTerm&&this.sub.equal(other.sub)&&this.inner.equal(other.inner);
}
Object.defineProperty(DoubleCapitalEpsilonTerm.prototype,"constructor",{
  value:DoubleCapitalEpsilonTerm,
  enumerable:false,
  writable:true
});

function ProductTerm(s){
  if (s instanceof ProductTerm) return s.clone();
  else if (s instanceof Term&&typeof s!="string") throw Error("Invalid expression: "+s);
  if (!(this instanceof ProductTerm)) return new ProductTerm(s);
  var r=Term.call(this,s);
  if (s&&!(r instanceof ProductTerm)) throw Error("Invalid expression: "+s);
  if (s) return r;
}
Object.assign(ProductTerm,Term);
ProductTerm.build=function (left,right){
  var r=ProductTerm();
  r.left=Term(left);
  r.right=Term(right);
  return r;
}
ProductTerm.prototype=Object.create(Term.prototype);
ProductTerm.prototype.clone=function (){
  return ProductTerm.build(this.left,this.right);
}
ProductTerm.prototype.toString=function (abbreviate){
  if (abbreviate&&this.right instanceof OneTerm) return this.left.toString(abbreviate);
  else return this.left.toString(abbreviate)+"×("+this.right.toString(abbreviate)+")";
}
ProductTerm.prototype.equal=function (other){
  if (!(other instanceof Term)) other=Term(other);
  return other instanceof ProductTerm&&this.left.equal(other.left)&&this.right.equal(other.right);
}
Object.defineProperty(ProductTerm.prototype,"constructor",{
  value:ProductTerm,
  enumerable:false,
  writable:true
});

function SumTerm(s){
  if (s instanceof SumTerm) return s.clone();
  else if (s instanceof Term&&typeof s!="string") throw Error("Invalid expression: "+s);
  if (!(this instanceof SumTerm)) return new SumTerm(s);
  var r=Term.call(this,s);
  if (s&&!(r instanceof SumTerm)) throw Error("Invalid expression: "+s);
  if (s) return r;
}
Object.assign(SumTerm,Term);
SumTerm.build=function (terms){
  var r=SumTerm();
  r.terms=[];
  for (var i=0;i<terms.length;i++){
    if (terms[i] instanceof SumTerm){
      r.terms=r.terms.concat(Term(terms[i]).terms);
    }else{
      r.terms.push(Term(terms[i]));
    }
  }
  return r;
}
SumTerm.prototype=Object.create(Term.prototype);
SumTerm.prototype.clone=function (){
  return SumTerm.build(this.terms);
}
SumTerm.prototype.toString=function (abbreviate){
  if (abbreviate){
      var strterms=this.terms.map(function (t){return t.toString(abbreviate);});
      for (var i=0;i<strterms.length;i++){
        if (strterms[i]=="1"){
          for (var j=i;j<strterms.length&&strterms[j]=="1";j++);
          strterms.splice(i,j-i,(j-i)+"");
        }
      }
      return strterms.join("+");
  }else{
    return this.terms.join("+");
  }
}
SumTerm.prototype.toStringWithImplicitBrace=function (abbreviate){
  if (abbreviate&&this.terms.every(function (t){return t instanceof OneTerm})) return this.toString(abbreviate);
  else return "{"+this.toString(abbreviate)+"}";
}
SumTerm.prototype.equal=function (other){
  if (!(other instanceof Term)) other=Term(other);
  return other instanceof SumTerm&&this.terms.length==other.terms.length&&this.terms.every(function (e,i){return Term(e).equal(other.terms[i]);});
}
SumTerm.prototype.getLeft=function (){
  return Term(this.terms[0]);
}
SumTerm.prototype.getNotLeft=function (){
  if (this.terms.length<=2) return Term(this.terms[1]);
  else return SumTerm.build(this.terms.slice(1));
}
SumTerm.prototype.getRight=function (){
  return Term(this.terms[this.terms.length-1]);
}
SumTerm.prototype.getNotRight=function (){
  if (this.terms.length<=2) return Term(this.terms[0]);
  else return SumTerm.build(this.terms.slice(0,-1));
}
SumTerm.prototype.slice=function (start,end){
  if (start<0) start=this.terms.length+start;
  if (end===undefined) end=this.terms.length;
  if (end<0) end=this.terms.length+end;
  if (start>=end) return NullTerm.build();
  else if (end-start==1) return Term(this.terms[start]);
  else return SumTerm.build(this.terms.slice(start,end));
}
Object.defineProperty(SumTerm.prototype,"constructor",{
  value:SumTerm,
  enumerable:false,
  writable:true
});

function removeBrace(s){
  return s.startsWith("{")&&s.endsWith("}")?s.slice(1,-1):s;
}
function splitPairs(t,s){
  var i=0;
  var a=[];
  while (i!=-1){
    i=t.indexOf(s,i+1);
    if (i==-1) break;
    a.push([t.slice(0,i),t.slice(i+s.length)]);
  }
  return a;
}
function isPairOf(t,f,g){
  return f(t[0])&&g(t[1]);
}
function isPairOfGen(f,g){
  return function (e){return isPairOf(e,f,g);};
}
function decomposeArray(t,f,s){
  var i=0;
  while (i!=-1){
    i=t.indexOf(s,i+1);
    if (i==-1) break;
    var rd;
    if (f(t.slice(0,i))&&(rd=decomposeArray(t.slice(i+s.length),f,s))){
      rd.unshift(t.slice(0,i));
      return rd;
    }
  }
  return f(t)?[t]:null;
}
function decomposeArrayIfLong(t,f,s){
  return t.indexOf(s)!=-1&&decomposeArray(t,f,s);
}
function isSumAndTermsSatisfy(t,f){
  return t instanceof SumTerm&&t.terms.every(f)&&t.terms;
}
function isNat(t){
  t=Term(t);
  return t instanceof OneTerm||(t instanceof SumTerm&&t.terms.every(function(t){return t instanceof OneTerm;}));
}
function inT(t){
  try{
    t=Term(t);
  }catch(e){
    return false;
  }
  if (equal(t,"0")) return true; //rule 1
  if (equal(t,"1")) return true; //rule 1
  if (equal(t,"E(ε(0)×(1))")) return true; //rule 2
  if (t instanceof SumTerm&&equal(t.getRight(),"E(ε(0)×(1))")&&inAT(t.getNotRight())) return true; //rule 3
  if (format["E(ε(0)×(*))"](t,inTnot01)) return true; //rule 4
  if (format["E(ε(0)×(*)+*)"](t,inTnot0,inRT)) return true; //rule 5
  if (format["EE_*(*)"](t,inAAT,inT)) return true; //rule 6
  if (format["EE_{E(ε(0)×(*)+*)}(*)"](t,inTnot0,inRT,inT)) return true; //rule 7
  if (format["E(*)"](t,inRT)) return true; //rule 12
  if (format["EE_{E(*)}(*)"](t,inRT,inT)) return true; //rule 13
  if (isSumAndTermsSatisfy(t,inPT)) return true; //rule 14
  return false;
}
function inPT(t){
  try{
    t=Term(t);
  }catch(e){
    return false;
  }
  if (equal(t,"1")) return true; //rule 1
  if (equal(t,"E(ε(0)×(1))")) return true; //rule 2
  if (format["E(ε(0)×(*))"](t,inTnot01)) return true; //rule 4
  if (format["E(ε(0)×(*)+*)"](t,inTnot0,inRT)) return true; //rule 5
  if (format["EE_*(*)"](t,inAAT,inT)) return true; //rule 6
  if (format["EE_{E(ε(0)×(*)+*)}(*)"](t,inTnot0,inRT,inT)) return true; //rule 7
  if (format["E(*)"](t,inRT)) return true; //rule 12
  if (format["EE_{E(*)}(*)"](t,inRT,inT)) return true; //rule 13
  return false;
}
function inAT(t){
  try{
    t=Term(t);
  }catch(e){
    return false;
  }
  if (equal(t,"E(ε(0)×(1))")) return true; //rule 2
  if (t instanceof SumTerm&&equal(t.getRight(),"E(ε(0)×(1))")&&inAT(t.getNotRight())) return true; //rule 3
  if (format["E(ε(0)×(*))"](t,inTnot01)) return true; //rule 4
  if (format["E(ε(0)×(*)+*)"](t,inTnot0,inRT)) return true; //rule 5
  if (format["EE_{E(ε(0)×(*)+*)}(*)"](t,inTnot0,inRT,inT)) return true; //rule 7
  if (isSumAndTermsSatisfy(t,inPAT)) return true; //rule 8
  return false;
}
function inAAT(t){
  try{
    t=Term(t);
  }catch(e){
    return false;
  }
  if (equal(t,"E(ε(0)×(1))")) return true; //rule 2
  if (t instanceof SumTerm&&equal(t.getRight(),"E(ε(0)×(1))")&&inAT(t.getNotRight())) return true; //rule 3
  return false;
}
function inRT(t){
  try{
    t=Term(t);
  }catch(e){
    return false;
  }
  if (format["*×(*)"](t,inPRT,inTnot0)) return true; //rule 10
  if (isSumAndTermsSatisfy(t,format["*×(*)"](inPRT,inTnot0))) return true; //rule 11
  return false;
}
function inPRT(t){
  try{
    t=Term(t);
  }catch(e){
    return false;
  }
  if (format["ε([*])"](t,inAT)) return true; //rule 9
  return false;
}
function inRPT(t){
  try{
    t=Term(t);
  }catch(e){
    return false;
  }
  if (format["*×(*)"](t,inPRT,inTnot0)) return true; //rule 10
  return false;
}
function inPAT(t){
  try{
    t=Term(t);
  }catch(e){
    return false;
  }
  return inPT(t)&&inAT(t);
}
function inTnot0(t){
  try{
    t=Term(t);
  }catch(e){
    return false;
  }
  return !equal(t,"0")&&inT(t);
}
function inTnot01(t){
  try{
    t=Term(t);
  }catch(e){
    return false;
  }
  return !equal(t,"0")&&!equal(t,"1")&&inT(t);
}
var format={};
format["E(*)"]=function (t,f){
  if (t instanceof Function) return function(s){return format["E(*)"](s,t);};
  t=Term(t);
  return t instanceof CapitalEpsilonTerm&&f(t.inner)&&t.inner;
};
format["ε(0)×(*)"]=function (t,f){
  if (t instanceof Function) return function(s){return format["ε(0)×(*)"](s,t);};
  t=Term(t);
  return t instanceof ProductTerm&&t.left instanceof SmallEpsilonTerm&&t.left.inner instanceof ZeroTerm&&f(t.right)&&t.right;
};
format["E(ε(0)×(*))"]=function (t,f){
  if (t instanceof Function) return function(s){return format["E(ε(0)×(*))"](s,t);};
  t=Term(t);
  return t instanceof CapitalEpsilonTerm&&format["ε(0)×(*)"](t.inner,f);
};
format["E(ε(0)×(*)+*)"]=function (t,f,g){
  if (t instanceof Function) return function(s){return format["E(ε(0)×(*)+*)"](s,t,f);};
  t=Term(t);
  if (t instanceof CapitalEpsilonTerm&&t.inner instanceof SumTerm){
    var left=t.inner.getLeft();
    var notleft=t.inner.getNotLeft();
    var t1=format["ε(0)×(*)"](left,f);
    return t1&&g(notleft)&&[t1,notleft];
  }else return false;
};
format["EE_*(*)"]=function (t,f,g){
  if (t instanceof Function) return function(s){return format["EE_*(*)"](s,t,f);};
  t=Term(t);
  return t instanceof DoubleCapitalEpsilonTerm&&f(t.sub)&&g(t.inner)&&[t.sub,t.inner];
};
format["EE_{E(ε(0)×(*)+*)}(*)"]=function (t,f,g,h){
  if (t instanceof Function) return function(s){return format["EE_{E(ε(0)×(*)+*)}(*)"](s,t,f,g);};
  t=Term(t);
  var t1;
  return t instanceof DoubleCapitalEpsilonTerm&&(t1=format["E(ε(0)×(*)+*)"](t.sub,f,g))&&h(t.inner)&&[t1[0],t1[1],t.inner];
};
format["EE_{E(*)}(*)"]=function (t,f,g){
  if (t instanceof Function) return function(s){return format["EE_{E(*)}(*)"](s,t,f);};
  t=Term(t);
  var t1;
  return t instanceof DoubleCapitalEpsilonTerm&&(t1=format["E(*)"](t.sub,f))&&g(t.inner)&&[t1,t.inner];
};
format["ε([*])"]=function (t,f){
  if (t instanceof Function) return function(s){return format["ε([*])"](s,t);};
  t=Term(t);
  return t instanceof SmallEpsilonBracketTerm&&f(t.inner)&&t.inner;
};
format["ε([*])×(*)"]=function (t,f,g){
  if (t instanceof Function) return function(s){return format["ε([*])×(*)"](s,t,f);};
  t=Term(t);
  return t instanceof ProductTerm&&t.left instanceof SmallEpsilonBracketTerm&&f(t.left.inner)&&g(t.right)&&[t.left.inner,t.right];
};
format["*+*"]=function (t,f,g){
  if (t instanceof Function) return function(s){return format["*+*"](s,t,f);};
  t=Term(t);
  if (t instanceof SumTerm){
    for (var i=1;i<t.terms.length;i++){
      var left=t.slice(0,i);
      var right=t.slice(i);
      if (f(left)&&g(right)) return [left,right];
    }
  }else return false;
};
format["*×(*)"]=function (t,f,g){
  if (t instanceof Function) return function(s){return format["*×(*)"](s,t,f);};
  t=Term(t);
  return t instanceof ProductTerm&&f(t.left)&&g(t.right)&&[t.left,t.right];
};
format.nest=function (t,f,...p){
  if (t instanceof Function) return function(s){return format.nest(s,t,f,...p);};
  var t1=f(t,...p);
  if (!t1) return false;
  if (!t1 instanceof Array) t1=[t1];
  var t2=[];
  for (var i=0;i<p.length;i++){
    var t3=p[i](t1[i]);
    if (t3 instanceof Array) t2=t2.concat(t3);
    else if (typeof t3=="boolean") t2.push(t1[i]);
    else t2.push(t3);
  }
  return t2;
};
function equal(X,Y){
  if (arguments.length==1) return function(t){return equal(t,X);};
  X=Term(X);
  Y=Term(Y);
  return X.equal(Y);
}
function notEqual(X,Y){
  if (arguments.length==1) return function(t){return notEqual(t,X);};
  return !equal(X,Y);
}
function lessThan(X,Y){
  X=Term(X);
  Y=Term(Y);
  var argsInRT=inRT(X)&&inRT(Y);
  if (argsInRT){ //1
    if (equal(X,"ε([A])×(1)")) return !equal(X,Y); //1-1
    var t1=format["ε([*])×(*)"](X,inAT,inTnot0);
    if (t1){ //1-2
      var [X1,Z]=t1;
      var t2=format["ε([*])×(*)"](Y,inAT,inTnot0);
      if (t2){ //1-2-1
        var [Y1,Zp]=t2;
        if (equal(X1,Y1)) return lessThan(Z,Zp); //1-2-1-1
        if (!equal(X1,Y1)) return lessThan(X1,Y1); //1-2-1-2
      }
      var YZs=isSumAndTermsSatisfy(Y,format["ε([*])×(*)"](inAT,inTnot0));
      if (YZs){ //1-2-2
        var [Y1,Z1]=format["ε([*])×(*)"](YZs[0],inAT,inTnot0);
        if (equal(X1,Y1)) return lessThanOrEqual(Z,Z1); //1-2-2-1
        if (!equal(X1,Y1)) return lessThan(X1,Y1); //1-2-1-2
      }
    }
    var Xs=isSumAndTermsSatisfy(X,inRPT);
    if (Xs){ //1-3
      var m=Xs.length;
      var X1=Xs[0];
      var Ys=isSumAndTermsSatisfy(Y,inRPT);
      if (Ys){ //1-3-1
        var mp=Ys.length;
        var Y1=Ys[0];
        if (equal(X1,Y1)){ //1-3-1-1
          if (m==2&&mp==2) return lessThan(Xs[1],Ys[1]); //1-3-1-1-1
          if (m==2&&mp>2) return lessThan(Xs[1],Ys.slice(1).join("+")); //1-3-1-1-2
          if (m>2&&mp==2) return lessThan(Xs.slice(1).join("+"),Ys[1]); //1-3-1-1-3
          if (m>2&&mp>2) return lessThan(Xs.slice(1).join("+"),Ys.slice(1).join("+")); //1-3-1-1-4
        }
        if (!equal(X1,Y1)) return lessThan(X1,Y1); //1-3-1-2
      }
      else return !lessThanOrEqual(Y,X); //1-3-2
    }
  }
  var argsInT=inT(X)&&inT(Y);
  if (argsInT){ //2
    if (equal(X,"0")) return !equal(Y,"0") //2-1
    if (equal(X,"1")) return !equal(Y,"0")&&!equal(Y,"1") //2-2
    var Z=format["E(ε(0)×(*))"](X,inTnot0);
    if (Z){ //2-3
      var Zp=format["E(ε(0)×(*))"](Y,inTnot0);
      if (Zp) return lessThan(Z,Zp); //2-3-1
      var t1=format["E(ε(0)×(*)+*)"](Y,inTnot0,inRT);
      if (t1) return lessThanOrEqual(Z,t1[0]); //2-3-2
      if (format["EE_*(*)"](Y,inAAT,inT)) return false; //2-3-3
      var t1=format["EE_{E(ε(0)×(*)+*)}(*)"](Y,inTnot0,inRT,inT);
      if (t1){ //2-3-4
        var [Zp,Rp,Y2]=t1;
        return lessThanOrEqual(Z,Zp);
      }
      if (format["E(*)"](Y,inRT)) return false; //2-3-5
      if (format["EE_{E(*)}(*)"](Y,inRT,inT)) return false; //2-3-6
      return !lessThanOrEqual(Y,X); //2-3-7
    }
    var t1=format["E(ε(0)×(*)+*)"](X,inTnot0,inRT);
    if (t1){ //2-4
      var [Z,R]=t1;
      var t2=format["E(ε(0)×(*)+*)"](Y,inTnot0,inRT);
      if (t2){ //2-4-1
        var [Zp,Rp]=t2;
        if (equal(Z,Zp)) return lessThan(R,Rp); //2-4-1-1
        if (!equal(Z,Zp)) return lessThan(Z,Zp); //2-4-1-2
      }
      if (format["EE_*(*)"](Y,inAAT,inT)) return false; //2-4-2
      var t2=format["EE_{E(ε(0)×(*)+*)}(*)"](Y,inTnot0,inRT,inT);
      if (t2){ //2-4-3
        var [Zp,Rp,Y2]=t2;
        if (equal(Z,Zp)){ //2-4-3-1
          var t3=format["ε([*])×(*)"](R,inAT,inTnot0);
          if (t3&&equal(Rp,"ε(["+t3[0]+"+A])×(1)")){ //2-4-3-1-1
            var [X1,Z1]=t3;
            return lessThan(Z1,Y);
          }
          var t3=format.nest(R,format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT);
          if (t3&&equal(Rp,"ε(["+t3[0]+"+A])×(1)")){ //2-4-3-1-2
            var [X1,Z1,R1]=t3;
            return lessThanOrEqual(Z1,Y);
          }
          var t3=format.nest(R,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0));
          if (t3&&equal(t3[0],t3[3])&&equal(Rp,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-4-3-1-3
            var [X1,_A,Z1,X1,Z2]=t3;
            return lessThan(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
          if (t3&&equal(t3[0],t3[3])&&equal(Rp,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-4-3-1-4
            var [X1,_A,Z1,X1,Z2,R1]=t3;
            return lessThanOrEqual(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0)));
          if (t3&&equal(t3[1],t3[4])&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-4-3-1-5
            var [R1,X1,_A,Z1,X1,Z2]=t3;
            return lessThan(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT)));
          if (t3&&equal(t3[1],t3[4])&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-4-3-1-6
            var [R1,X1,_A,Z1,X1,Z2,R2]=t3;
            return lessThanOrEqual(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](inAT,inTnot0));
          if (t3&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-4-3-1-7
            var [R1,X1,Z1]=t3;
            return lessThan(Z1,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
          if (t3&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-4-3-1-8
            var [R1,X1,Z1,R2]=t3;
            return lessThanOrEqual(Z1,Y);
          }
          return lessThan(R,Rp); //2-4-3-1-9
        }
        else return lessThan(Z,Zp); //2-4-3-2
      }
      if (format["E(*)"](Y,inRT)) return false; //2-4-4
      if (format["EE_{E(*)}(*)"](Y,inRT,inT)) return false; //2-4-5
      return !lessThanOrEqual(Y,X); //2-4-6
    }
    var t1=format["EE_*(*)"](X,inAAT,inT);
    if (t1){ //2-5
      var [X1,X2]=t1;
      var t2=format["EE_*(*)"](Y,inAAT,inT);
      if (t2){ //2-5-1
        var [Y1,Y2]=t2;
        if (equal(X1,Y1)) return lessThan(X2,Y2); //2-5-1-1
        if (!equal(X1,Y1)) return lessThan(X1,Y1); //2-5-1-2
      }
      if (format["EE_{E(ε(0)×(*)+*)}(*)"](Y,inTnot0,inRT,inT)) return true; //2-5-2
      var Rp=format["E(*)"](Y,inRT);
      if (Rp) return lessThan("EE_{E(ε(["+X1+"])×(1))}("+X2+")",Y); //2-5-3
      var t2=format["EE_{E(*)}(*)"](Y,inRT,inT);
      if (t2){ //2-5-4
        var [Rp,Y2]=t2;
        if (equal(Rp,"ε(["+X1+"])×(1)")&&equal(X2,Y2)) return false; //2-5-4-1
        if (equal(Rp,"ε(["+X1+"])×(1)")&&!equal(X2,Y2)) return lessThan(X2,Y2); //2-5-4-2
        return lessThan("EE_{E(ε(["+X1+"])×(1))}("+X2+")",Y); //2-5-4-3
      }
      return !lessThanOrEqual(Y,X); //2-5-5
    }
    var t1=format["EE_{E(ε(0)×(*)+*)}(*)"](X,inTnot0,inRT,inT);
    if (t1){ //2-6
      var [Z,R,X2]=t1;
      var t2=format["EE_{E(ε(0)×(*)+*)}(*)"](Y,inTnot0,inRT,inT);
      if (t2){ //2-6-1
        var [Zp,Rp,Y2]=t2;
        if (equal(Z,Zp)&&equal(R,Rp)) return lessThan(X2,Y2); //2-6-1-1
        if (equal(Z,Zp)&&!equal(R,Rp)){ //2-6-1-2
          var t3=format["ε([*])×(*)"](R,inAT,inTnot0);
          if (t3&&equal(Rp,"ε(["+t3[0]+"+A])×(1)")){ //2-6-1-2-1
            var [X1,Z1]=t3;
            return lessThan(Z1,Y);
          }
          var t3=format.nest(R,format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT);
          if (t3&&equal(Rp,"ε(["+t3[0]+"+A])×(1)")){ //2-6-1-2-2
            var [X1,Z1,R1]=t3;
            return lessThanOrEqual(Z1,Y);
          }
          var t3=format.nest(R,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0));
          if (t3&&equal(t3[0],t3[3])&&equal(Rp,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-6-1-2-3
            var [X1,_A,Z1,X1,Z2]=t3;
            return lessThan(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
          if (t3&&equal(t3[0],t3[3])&&equal(Rp,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-6-1-2-4
            var [X1,_A,Z1,X1,Z2,R1]=t3;
            return lessThanOrEqual(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0)));
          if (t3&&equal(t3[1],t3[4])&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-6-1-2-5
            var [R1,X1,_A,Z1,X1,Z2]=t3;
            return lessThan(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT)));
          if (t3&&equal(t3[1],t3[4])&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-6-1-2-6
            var [R1,X1,_A,Z1,X1,Z2,R2]=t3;
            return lessThanOrEqual(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](inAT,inTnot0));
          if (t3&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-6-1-2-7
            var [R1,X1,Z1]=t3;
            return lessThan(Z1,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
          if (t3&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-6-1-2-8
            var [R1,X1,Z1,R2]=t3;
            return lessThanOrEqual(Z1,Y);
          }
          var t3=format["ε([*])×(*)"](Rp,inAT,inTnot0);
          if (t3&&equal(R,"ε(["+t3[0]+"+A])×(1)")){ //2-6-1-2-9
            var [X1,Z1]=t3;
            return lessThan(X,Z1);
          }
          var t3=format.nest(Rp,format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT);
          if (t3&&equal(R,"ε(["+t3[0]+"+A])×(1)")){ //2-6-1-2-10
            var [X1,Z1,R1]=t3;
            return lessThanOrEqual(X,Z1);
          }
          var t3=format.nest(Rp,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0));
          if (t3&&equal(t3[0],t3[3])&&equal(R,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-6-1-2-11
            var [X1,_A,Z1,X1,Z2]=t3;
            return lessThan(X,Z1);
          }
          var t3=format.nest(Rp,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
          if (t3&&equal(t3[0],t3[3])&&equal(R,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-6-1-2-12
            var [X1,_A,Z1,X1,Z2,R1]=t3;
            return lessThanOrEqual(X,Z1);
          }
          var t3=format.nest(Rp,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0)));
          if (t3&&equal(t3[1],t3[4])&&equal(R,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-6-1-2-13
            var [R1,X1,_A,Z1,X1,Z2]=t3;
            return lessThan(X,Z2);
          }
          var t3=format.nest(Rp,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT)));
          if (t3&&equal(t3[1],t3[4])&&equal(R,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-6-1-2-14
            var [R1,X1,_A,Z1,X1,Z2,R2]=t3;
            return lessThanOrEqual(X,Z2);
          }
          var t3=format.nest(Rp,format["*+*"],inRT,format["ε([*])×(*)"](inAT,inTnot0));
          if (t3&&equal(R,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-6-1-2-15
            var [R1,X1,Z1]=t3;
            return lessThan(X,Z1);
          }
          var t3=format.nest(Rp,format["*+*"],inRT,format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
          if (t3&&equal(R,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-6-1-2-16
            var [R1,X1,Z1,R2]=t3;
            return lessThanOrEqual(X,Z1);
          }
          return lessThan(R,Rp); //2-6-1-2-17
        }
        if (!equal(Z,Zp)) return lessThan(Z,Zp);
      }
      if (format["E(*)"](Y,inRT)) return false; //2-6-2
      if (format["EE_{E(*)}(*)"](Y,inRT,inT)) return false; //2-6-3
      return !lessThanOrEqual(Y,X); //2-6-4
    }
    var R=format["E(*)"](X,inRT);
    if (R){ //2-7
      var Rp=format["E(*)"](Y,inRT);
      if (Rp) return lessThan(R,Rp); //2-7-1
      var t1=format["EE_{E(*)}(*)"](Y,inRT,inT);
      if (t1){ //2-7-2
        var [Rp,Y2]=t1;
        var t3=format["ε([*])×(*)"](R,inAT,inTnot0);
        if (t3&&equal(Rp,"ε(["+t3[0]+"+A])×(1)")){ //2-7-2-1
          var [X1,Z1]=t3;
          return lessThan(Z1,Y);
        }
        var t3=format.nest(R,format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT);
        if (t3&&equal(Rp,"ε(["+t3[0]+"+A])×(1)")){ //2-7-2-2
          var [X1,Z1,R1]=t3;
          return lessThanOrEqual(Z1,Y);
        }
        var t3=format.nest(R,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0));
        if (t3&&equal(t3[0],t3[3])&&equal(Rp,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-7-2-3
          var [X1,_A,Z1,X1,Z2]=t3;
          return lessThan(Z2,Y);
        }
        var t3=format.nest(R,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
        if (t3&&equal(t3[0],t3[3])&&equal(Rp,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-7-2-4
          var [X1,_A,Z1,X1,Z2,R1]=t3;
          return lessThanOrEqual(Z2,Y);
        }
        var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0)));
        if (t3&&equal(t3[1],t3[4])&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-7-2-5
          var [R1,X1,_A,Z1,X1,Z2]=t3;
          return lessThan(Z2,Y);
        }
        var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT)));
        if (t3&&equal(t3[1],t3[4])&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-7-2-6
          var [R1,X1,_A,Z1,X1,Z2,R2]=t3;
          return lessThanOrEqual(Z2,Y);
        }
        var t3=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](inAT,inTnot0));
        if (t3&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-7-2-7
          var [R1,X1,Z1]=t3;
          return lessThan(Z1,Y);
        }
        var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
        if (t3&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-7-2-8
          var [R1,X1,Z1,R2]=t3;
          return lessThanOrEqual(Z1,Y);
        }
        return lessThan(R,Rp); //2-7-2-9
      }
      return !lessThanOrEqual(Y,X); //2-7-3
    }
    var t1=format["EE_{E(*)}(*)"](X,inRT,inT);
    if (t1){ //2-8
      var [R,X2]=t1;
      var t2=format["EE_{E(*)}(*)"](Y,inRT,inT);
      if (t2){ //2-8-1
        var [Rp,Y2]=t2;
        if (equal(R,Rp)) return lessThan(X2,Y2); //2-8-1-1
        if (!equal(R,Rp)){ //2-8-1-2
          var t3=format["ε([*])×(*)"](R,inAT,inTnot0);
          if (t3&&equal(Rp,"ε(["+t3[0]+"+A])×(1)")){ //2-8-1-2-1
            var [X1,Z1]=t3;
            return lessThan(Z1,Y);
          }
          var t3=format.nest(R,format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT);
          if (t3&&equal(Rp,"ε(["+t3[0]+"+A])×(1)")){ //2-8-1-2-2
            var [X1,Z1,R1]=t3;
            return lessThanOrEqual(Z1,Y);
          }
          var t3=format.nest(R,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0));
          if (t3&&equal(t3[0],t3[3])&&equal(Rp,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-8-1-2-3
            var [X1,_A,Z1,X1,Z2]=t3;
            return lessThan(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
          if (t3&&equal(t3[0],t3[3])&&equal(Rp,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-8-1-2-4
            var [X1,_A,Z1,X1,Z2,R1]=t3;
            return lessThanOrEqual(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0)));
          if (t3&&equal(t3[1],t3[4])&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-8-1-2-5
            var [R1,X1,_A,Z1,X1,Z2]=t3;
            return lessThan(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT)));
          if (t3&&equal(t3[1],t3[4])&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-8-1-2-6
            var [R1,X1,_A,Z1,X1,Z2,R2]=t3;
            return lessThanOrEqual(Z2,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](inAT,inTnot0));
          if (t3&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-8-1-2-7
            var [R1,X1,Z1]=t3;
            return lessThan(Z1,Y);
          }
          var t3=format.nest(R,format["*+*"],inRT,format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
          if (t3&&equal(Rp,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-8-1-2-8
            var [R1,X1,Z1,R2]=t3;
            return lessThanOrEqual(Z1,Y);
          }
          var t3=format["ε([*])×(*)"](Rp,inAT,inTnot0);
          if (t3&&equal(R,"ε(["+t3[0]+"+A])×(1)")){ //2-8-1-2-9
            var [X1,Z1]=t3;
            return lessThan(X,Z1);
          }
          var t3=format.nest(Rp,format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT);
          if (t3&&equal(R,"ε(["+t3[0]+"+A])×(1)")){ //2-8-1-2-10
            var [X1,Z1,R1]=t3;
            return lessThanOrEqual(X,Z1);
          }
          var t3=format.nest(Rp,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0));
          if (t3&&equal(t3[0],t3[3])&&equal(R,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-8-1-2-11
            var [X1,_A,Z1,X1,Z2]=t3;
            return lessThan(X,Z2);
          }
          var t3=format.nest(Rp,format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
          if (t3&&equal(t3[0],t3[3])&&equal(R,"ε(["+t3[0]+"+A])×("+t3[2]+"+1)")){ //2-8-1-2-12
            var [X1,_A,Z1,X1,Z2,R1]=t3;
            return lessThanOrEqual(X,Z1);
          }
          var t3=format.nest(Rp,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format["ε([*])×(*)"](inAT,inTnot0)));
          if (t3&&equal(t3[1],t3[4])&&equal(R,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-8-1-2-13
            var [R1,X1,_A,Z1,X1,Z2]=t3;
            return lessThan(X,Z2);
          }
          var t3=format.nest(Rp,format["*+*"],inRT,format.nest(format["*+*"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0),format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT)));
          if (t3&&equal(t3[1],t3[4])&&equal(R,t3[0]+"+ε(["+t3[1]+"+A])×("+t3[3]+"+1)")){ //2-8-1-2-14
            var [R1,X1,_A,Z1,X1,Z2,R2]=t3;
            return lessThanOrEqual(X,Z2);
          }
          var t3=format.nest(Rp,format["*+*"],inRT,format["ε([*])×(*)"](inAT,inTnot0));
          if (t3&&equal(R,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-8-1-2-15
            var [R1,X1,Z1]=t3;
            return lessThan(X,Z1);
          }
          var t3=format.nest(Rp,format["*+*"],inRT,format.nest(format["*+*"],format["ε([*])×(*)"](inAT,inTnot0),inRT));
          if (t3&&equal(R,t3[0]+"+ε(["+t3[1]+"+A])×(1)")){ //2-8-1-2-16
            var [R1,X1,Z1,R2]=t3;
            return lessThanOrEqual(X,Z1);
          }
          return lessThan(R,Rp); //2-8-1-2-17
        }
      }
      else return !lessThanOrEqual(Y,X); //2-8-2
    }
    var Xs=isSumAndTermsSatisfy(X,inPT);
    if (Xs){ //2-9
      var m=Xs.length;
      var X1=Xs[0];
      if (equal(Y,"0")) return false; //2-9-1
      if (inPT(Y)) return lessThan(X1,Y); //2-9-2
      var Ys=isSumAndTermsSatisfy(Y,inPT);
      if (Ys){ //2-9-3
        var mp=Ys.length;
        var Y1=Ys[0];
        if (equal(X1,Y1)){ //2-9-3-1
          if (m==2&&mp==2) return lessThan(Xs[1],Ys[1]); //2-9-3-1-1
          if (m==2&&mp>2) return lessThan(Xs[1],Ys.slice(1).join("+")); //2-9-3-1-2
          if (m>2&&mp==2) return lessThan(Xs.slice(1).join("+"),Ys[1]); //2-9-3-1-3
          if (m>2&&mp>2) return lessThan(Xs.slice(1).join("+"),Ys.slice(1).join("+")); //2-9-3-1-4
        }
        if (!equal(X1,Y1)) return lessThan(X1,Y1); //2-9-3-2
      }
    }
  }
  if (!argsInRT&&!argsInT) throw Error("Invalid argument: "+X+","+Y);
  throw Error("No rule to compare "+X+" and "+Y);
}
function lessThanOrEqual(X,Y){
  X=Term(X);
  Y=Term(Y);
  return equal(X,Y)||lessThan(X,Y);
}
function dom(X){
  X=Term(X);
  if (!inT(X)) throw Error("Invalid argument: "+X);
  var Y=null;
  if (equal(X,"0")) return "0"; //1
  if (equal(X,"1")) return "1"; //2
  var t1=format["EE_*(*)"](X,inAAT,inT);
  if (t1){ //3
    var [X1,X2]=t1;
    if (equal(X1,"A")){ //3-1
      if (equal(dom(X2),"0")){ //3-1-1
        return normalizeAbbreviations("ω");
        if (isNat(Y)); //3-1-1-1
        else; //3-1-1-2
      }
      if (equal(dom(X2),"1")){ //3-1-2
        return normalizeAbbreviations("ω");
        if (isNat(Y)); //3-1-2-1
        else; //3-1-2-2
      }
      if (equal(dom(X2),"ω")) return normalizeAbbreviations("ω"); //3-1-3
      if (["0","1","ω"].every(notEqual(dom(X2)))){ //3-1-4
        if (lessThan(X,dom(X2))){ //3-1-4-1
          return normalizeAbbreviations("ω");
          if (equal(X2,"A")){ //3-1-4-1-1
            var t2=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t2){ //3-1-4-1-1-1
              var [_X1,G]=t2;
            }
            else; //3-1-4-1-1-2
          }
          var t2=format["*+*"](X2,inAT,equal("A"));
          if (t2){ //3-1-4-1-2
            var [Xp2,_A]=t2;
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-1-4-1-2-1
              var [_X1,G]=t1;
            }
            else; //3-1-4-1-2-2
          }
          if (equal(dom(X2),"A")){ //3-1-4-1-3
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-1-4-1-3-1
              var [_X1,G]=t1;
            }
            else; //3-1-4-1-3-2
          }
          var Z=format["E(ε(0)×(*))"](dom(X2),function(t){return t!="0"&&t!="1"&&inT(t);});
          if (Z){ //3-1-4-1-4
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-1-4-1-4-1
              var [_X1,G]=t1;
            }
            else; //3-1-4-1-4-2
          }
          var t2=format["E(ε(0)×(*)+*)"](dom(X2),inTnot0,inRT);
          if (t2){ //3-1-4-1-5
            var [Z,R]=t2;
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-1-4-1-5-1
              var [_X1,G]=t1;
            }
            else; //3-1-4-1-5-2
          }
          var R=format["E(*)"](dom(X2),inRT);
          if (R){ //3-1-4-1-6
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-1-4-1-6-1
              var [_X1,G]=t1;
            }
            else; //3-1-4-1-6-2
          }
        }
        else return dom(X2); //3-1-4-2
      }
    }
    var t2=format["*+*"](X1,inAT,equal("A"));
    if (t2){ //3-2
      var [Xp1,_A]=t2;
      if (equal(dom(X2),"0")){ //3-2-1
        return normalizeAbbreviations("ω");
        if (isNat(Y)); //3-2-1-1
        else; //3-2-1-2
      }
      if (equal(dom(X2),"1")){ //3-2-2
        return normalizeAbbreviations("ω");
        if (isNat(Y)); //3-2-2-1
        else; //3-2-2-2
      }
      if (equal(dom(X2),"ω")) return normalizeAbbreviations("ω"); //3-2-3
      if (["0","1","ω"].every(notEqual(dom(X2)))){ //3-2-4
        if (lessThan(X,dom(X2))){ //3-2-4-1
          return normalizeAbbreviations("ω");
          if (equal(X2,"A")){ //3-2-4-1-1
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-1-1
              var [_X1,G]=t1;
            }
            else; //3-2-4-1-1-2
          }
          var t3=format["*+*"](X2,inAT,equal("A"));
          if (t3){ //3-2-4-1-2
            var [Xp2,_A]=t3;
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-2-1
              var [_X1,G]=t1;
            }
            else; //3-2-4-1-2-2
          }
          if (equal(dom(X2),"A")){ //3-2-4-1-3
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-3-1
              var [_X1,G]=t1;
            }
            else; //3-2-4-1-3-2
          }
          var Z=format["E(ε(0)×(*))"](dom(X2),function(t){return t!="0"&&t!="1"&&inT(t);});
          if (Z){ //3-2-4-1-4
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-4-1
              var [_X1,G]=t1;
            }
            else; //3-2-4-1-4-2
          }
          var t3=format["E(ε(0)×(*)+*)"](dom(X2),inTnot0,inRT);
          if (t3){ //3-2-4-1-5
            var [Z,R]=t3;
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-5-1
              var [_X1,G]=t1;
            }
            else; //3-2-4-1-5-2
          }
          var R=format["E(*)"](dom(X2),inRT);
          if (R){ //3-2-4-1-6
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-6-1
              var [_X1,G]=t1;
            }
            else; //3-2-4-1-6-2
          }
        }
        else return dom(X2); //3-2-4-2
      }
    }
  }
  var t1=format["EE_{E(ε(0)×(*)+*)}(*)"](X,inTnot0,inRT,inT);
  if (t1){ //4
    var [Z,R,X2]=t1;
    if (equal(dom(X2),"0")){ //4-1
      return normalizeAbbreviations("ω");
      if (equal(R,"ε([A])×(1)")){ //4-1-1
        if (isNat(Y)); //4-1-1-1
        else; //4-1-1-2
      }
      var t2=format["*+*"](R,inRT,equal("ε([A])×(1)"));
      if (t2){ //4-1-2
        var [Rp,_C]=t2;
        var t3=format.nest(Rp,format["ε([*])×(*)"],inAT,format.nest(format["EE_{E(ε(0)×(*)+*)}(*)"],equal(Z),format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")),inT));
        if (t3&&equal(t3[0],t3[2])){ //4-1-2-1
          var [Xp,Z,Xp,_A,_1,Xp2]=t3;
          if (isNat(Y)); //4-1-2-1-1
          else; //4-1-2-1-2
        }
        var t3=format.nest(Rp,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],inAT,format.nest(format["EE_{E(ε(0)×(*)+*)}(*)"],equal(Z),format.nest(format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0)),inT)));
        if (t3&&equal(t3[1],t3[4])){ //4-1-2-2
          var [Rpp,Xp,Z,Rppp,Xp,_A,Zp,Xp2]=t3;
          if (isNat(Y)); //4-1-2-2-1
          else; //4-1-2-2-2
        }
        if (true){ //4-1-2-3
          if (isNat(Y)); //4-1-2-3-1
          else; //4-1-2-3-2
        }
      }
      var t2=format["ε([*])×(*)"](R,equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //4-1-3
        var [_A,Z1]=t2;
        var t3=format.nest(Z1,format["*+*"],format["EE_{E(ε(0)×(*)+*)}(*)"](equal(Z),equal("ε([A+A])×(1)"),inT),equal("1"));
        if (t3){ //4-1-3-1
          var [_Z,_C,Xp2,_1]=t3;
          if (isNat(Y)); //4-1-3-1-1
          else; //4-1-3-1-2
        }
        else{ //4-1-3-2
          if (isNat(Y)); //4-1-3-2-1
          else; //4-1-3-2-2
        }
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //4-1-4
        var [Rp,_A,Z1]=t2;
        var t3=format.nest(Z1,format["*+*"],format.nest(format["EE_{E(ε(0)×(*)+*)}(*)"],equal(Z),format.nest(format["*+*"],inRT,format["ε([*])×(*)"](equal("A+A"),inTnot0),inT)),equal("1"));
        if (t3){ //4-1-4-1
          var [_Z,Rpp,_C,Zp1,Xp2,_1]=t3;
          if (isNat(Y)); //4-1-4-1-1
          else; //4-1-4-1-2
        }
        else{ //4-1-4-2
          if (isNat(Y)); //4-1-4-2-1
          else; //4-1-4-2-2
        }
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1"));
      if (t2){ //4-1-5
        var [Xp,_A,_1]=t2;
        if (isNat(Y)); //4-1-5-1
        else; //4-1-5-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")));
      if (t2){ //4-1-6
        var [Rp,Xp,_A,_1]=t2;
        if (isNat(Y)); //4-1-6-1
        else; //4-1-6-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //4-1-7
        var [Xp,_A,Z1]=t2;
        if (isNat(Y)); //4-1-7-1
        else; //4-1-7-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //4-1-8
        var [Rp,Xp,_A,Z1]=t2;
        if (isNat(Y)); //4-1-8-1
        else; //4-1-8-2
      }
      var t2=format["ε([*])×(*)"](R,inAT,inTnot0);
      if (t2){ //4-1-9
        var [Xp,Z1]=t2;
        if (equal(dom(Xp),"ω")); //4-1-9-1
        var Zp=format["E(ε(0)×(*))"](dom(Xp),inTnot0);
        if (Zp){ //4-1-9-2
          if (equal(Z1,"1")){ //4-1-9-2-1
            if (equal(Zp,"1")){ //4-1-9-2-1-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format["ε([*])×(*)"](inAT,equal("1")));
              if (t3){ //4-1-9-2-1-1-1
                var [_Z,G,_1]=t3;
              }
              else; //4-1-9-2-1-1-2
            }
            else{ //4-1-9-2-1-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format["ε([*])×(*)"](inAT,equal("1")));
              if (t3){ //4-1-9-2-1-2-1
                var [_Z,G,_1]=t3;
              }
              else; //4-1-9-2-1-2-2
            }
          }
          else{ //4-1-9-2-2
            if (equal(Zp,"1")){ //4-1-9-2-2-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //4-1-9-2-2-1-1
                var [_Z,_C,G,_1]=t3;
              }
              else; //4-1-9-2-2-1-2
            }
            else{ //4-1-9-2-2-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //4-1-9-2-2-2-1
                var [_Z,_C,G,_1]=t3;
              }
              else; //4-1-9-2-2-2-2
            }
          }
        }
        var t3=format["E(ε(0)×(*)+*)"](dom(Xp),inTnot0,inRT);
        if (t3){ //4-1-9-3
          var [Zp,Rp]=t3;
          if (equal(Z1,"1")){ //4-1-9-3-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format["ε([*])×(*)"](inAT,equal("1")));
            if (t3){ //4-1-9-3-1-1
              var [_Z,G,_1]=t3;
            }
            else; //4-1-9-3-1-2
          }
          else{ //4-1-9-3-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //4-1-9-3-2-1-1
              var [_Z,_C,G,_1]=t3;
            }
            else; //4-1-9-3-2-1-2
          }
        }
        var Rp=format["E(*)"](dom(Xp),inRT);
        if (Rp){ //4-1-9-4
          if (equal(Z1,"1")){ //4-1-9-4-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format["ε([*])×(*)"](inAT,equal("1")));
            if (t3){ //4-1-9-4-1-1
              var [_Z,G,_1]=t3;
            }
            else; //4-1-9-4-1-2
          }
          else{ //4-1-9-4-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //4-1-9-4-2-1-1
              var [_Z,_C,G,_1]=t3;
            }
            else; //4-1-9-4-2-1-2
          }
        }
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](inAT,inTnot0));
      if (t2){ //4-1-10
        var [R1,Xp,Z1]=t2;
        if (equal(dom(Xp),"ω")); //4-1-10-1
        var Zp=format["E(ε(0)×(*))"](dom(Xp),inTnot0);
        if (Zp){ //4-1-10-2
          if (equal(Z1,"1")){ //4-1-10-2-1
            if (equal(Zp,"1")){ //4-1-10-2-1-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //4-1-10-2-1-1-1
                var [_Z,_R1,G,_1]=t3;
              }
              else; //4-1-10-2-1-1-2
            }
            else{ //4-1-10-2-1-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //4-1-10-2-1-2-1
                var [_Z,_R1,G,_1]=t3;
              }
              else; //4-1-10-2-1-2-2
            }
          }
          else{ //4-1-10-2-2
            if (equal(Zp,"1")){ //4-1-10-2-2-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
              if (t3){ //4-1-10-2-2-1-1
                var [_Z,_R1,_C,G,_1]=t3;
              }
              else; //4-1-10-2-2-1-2
            }
            else{ //4-1-10-2-2-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
              if (t3){ //4-1-10-2-2-2-1
                var [_Z,_R1,_C,G,_1]=t3;
              }
              else; //4-1-10-2-2-2-2
            }
          }
        }
        var t3=format["E(ε(0)×(*)+*)"](dom(Xp),inTnot0,inRT);
        if (t3){ //4-1-10-3
          var [Zp,Rp]=t3;
          if (equal(Z1,"1")){ //4-1-10-3-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //4-1-10-3-1-1
              var [_Z,_R1,G,_1]=t3;
            }
            else; //4-1-10-3-1-2
          }
          else{ //4-1-10-3-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
            if (t3){ //4-1-10-3-2-1-1
              var [_Z,_R1,_C,G,_1]=t3;
            }
            else; //4-1-10-3-2-1-2
          }
        }
        var Rp=format["E(*)"](dom(Xp),inRT);
        if (Rp){ //4-1-10-4
          if (equal(Z1,"1")){ //4-1-10-4-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //4-1-10-4-1-1
              var [_Z,_R1,G,_1]=t3;
            }
            else; //4-1-10-4-1-2
          }
          else{ //4-1-10-4-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
            if (t3){ //4-1-10-4-2-1-1
              var [_Z,_R1,_C,G,_1]=t3;
            }
            else; //4-1-10-4-2-1-2
          }
        }
      }
    }
    if (equal(dom(X2),"1")){ //4-2
      return normalizeAbbreviations("ω");
      if (equal(R,"ε([A])×(1)")){ //4-2-1
        if (isNat(Y)); //4-2-1-1
        else; //4-2-1-2
      }
      var t2=format["*+*"](R,inRT,equal("ε([A])×(1)"));
      if (t2){ //4-2-2
        var [Rp,_C]=t2;
        if (isNat(Y)); //4-2-2-1
        else; //4-2-2-2
      }
      var t2=format["ε([*])×(*)"](R,equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //4-2-3
        var [_A,Z1]=t2;
        if (isNat(Y)); //4-2-3-1
        else; //4-2-3-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //4-2-4
        var [Rp,_A,Z1]=t2;
        if (isNat(Y)); //4-2-4-1
        else; //4-2-4-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1"));
      if (t2){ //4-2-5
        var [Xp,_A,_1]=t2;
        if (isNat(Y)); //4-2-5-1
        else; //4-2-5-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")));
      if (t2){ //4-2-6
        var [Rp,Xp,_A,_1]=t2;
        if (isNat(Y)); //4-2-6-1
        else; //4-2-6-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //4-2-7
        var [Xp,_A,Z1]=t2;
        if (isNat(Y)); //4-2-7-1
        else; //4-2-7-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //4-2-8
        var [Rp,Xp,_A,Z1]=t2;
        if (isNat(Y)); //4-2-8-1
        else; //4-2-8-2
      }
      if (true){ //4-2-9
        if (isNat(Y)); //4-2-8-1
        else; //4-2-8-2
      }
    }
    if (equal(dom(X2),"ω")) return normalizeAbbreviations("ω"); //4-3
    if (["0","1","ω"].every(notEqual(dom(X2)))){ //4-4
      if (lessThan(X,dom(X2))){ //4-4-1
        return normalizeAbbreviations("ω");
        var Zp=format["E(ε(0)×(*))"](dom(X2),function(t){return t!="0"&&t!="1"&&inT(t);});
        if (Zp){ //4-4-1-1
          var t2=isNat(Y)&&format["EE_{E(ε(0)×(*)+(*))}(*)"](fund(X,fund(Y,"0")),equal(Z),equal(R),inT);
          if (t2){ //4-4-1-1-1
            var [_Z,_R,G]=t2;
          }
          else; //4-4-1-1-2
        }
        var t2=format["E(ε(0)×(*)+*)"](dom(X2),function(t){return t!="0"&&t!="1"&&inT(t);},inRT);
        if (t2){ //4-4-1-2
          var [Zp,Rp]=t2;
          var t3=isNat(Y)&&format["EE_{E(ε(0)×(*)+(*))}(*)"](fund(X,fund(Y,"0")),equal(Z),equal(R),inT);
          if (t3){ //4-4-1-2-1
            var [_Z,_R,G]=t3;
          }
          else; //4-4-1-2-2
        }
      }
      else return dom(X2); //4-4-2
    }
  }
  var t1=format["EE_{E(*)}(*)"](X,inRT,inT);
  if (t1){ //5
    var [R,X2]=t1;
    if (equal(dom(X2),"0")){ //5-1
      return normalizeAbbreviations("ω");
      if (equal(R,"ε([A])×(1)")){ //5-1-1
        if (isNat(Y)); //5-1-1-1
        else; //5-1-1-2
      }
      var t2=format["*+*"](R,inRT,equal("ε([A])×(1)"));
      if (t2){ //5-1-2
        var [Rp,_C]=t2;
        var t3=format.nest(Rp,format["ε([*])×(*)"],inAT,format.nest(format["EE_{E(*)}(*)"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")),inT));
        if (t3&&equal(t3[0],t3[1])){ //5-1-2-1
          var [Xp,Xp,_A,_1,Xp2]=t3;
          if (isNat(Y)); //5-1-2-1-1
          else; //5-1-2-1-2
        }
        var t3=format.nest(Rp,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],inAT,format.nest(format["EE_{E(*)}(*)"],format.nest(format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0)),inT)));
        if (t3&&equal(t3[1],t3[3])){ //5-1-2-2
          var [Rpp,Xp,Rppp,Xp,_A,Zp,Xp2]=t3;
          if (isNat(Y)); //5-1-2-2-1
          else; //5-1-2-2-2
        }
        if (true){ //5-1-2-3
          if (isNat(Y)); //5-1-2-3-1
          else; //5-1-2-3-2
        }
      }
      var t2=format["ε([*])×(*)"](R,equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //5-1-3
        var [_A,Z1]=t2;
        var t3=format.nest(Z1,format["*+*"],format["EE_*(*)"](equal("E(ε([A+A])×(1))"),inT),equal("1"));
        if (t3){ //5-1-3-1
          var [_C,Xp2,_1]=t3;
          if (isNat(Y)); //5-1-3-1-1
          else; //5-1-3-1-2
        }
        var t3=format.nest(Z1,format["*+*"],format["EE_*(*)"](equal("A+A"),inT),equal("1"));
        if (t3){ //5-1-3-2
          var [_C,Xp2,_1]=t3;
          if (isNat(Y)); //5-1-3-2-1
          else; //5-1-3-2-2
        }
        if (true){ //5-1-3-3
          if (isNat(Y)); //5-1-3-3-1
          else; //5-1-3-3-2
        }
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //5-1-4
        var [Rp,_A,Z1]=t2;
        var t3=format.nest(Z1,format["*+*"],format.nest(format["EE_{E(*)}(*)"],format.nest(format["*+*"],inRT,format["ε([*])×(*)"](equal("A+A"),inTnot0)),inT),equal("1"));
        if (t3){ //5-1-4-1
          var [Rpp,_C,Zp1,Xp2,_1]=t3;
          if (isNat(Y)); //5-1-4-1-1
          else; //5-1-4-1-2
        }
        else{ //5-1-4-2
          if (isNat(Y)); //5-1-4-2-1
          else; //5-1-4-2-2
        }
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1"));
      if (t2){ //5-1-5
        var [Xp,_A,_1]=t2;
        if (isNat(Y)); //5-1-5-1
        else; //5-1-5-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")));
      if (t2){ //5-1-6
        var [Rp,Xp,_A,_1]=t2;
        if (isNat(Y)); //5-1-6-1
        else; //5-1-6-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //5-1-7
        var [Xp,_A,Z1]=t2;
        if (isNat(Y)); //5-1-7-1
        else; //5-1-7-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //5-1-8
        var [Rp,Xp,_A,Z1]=t2;
        if (isNat(Y)); //5-1-8-1
        else; //5-1-8-2
      }
      var t2=format["ε([*])×(*)"](R,inAT,inTnot0);
      if (t2){ //5-1-9
        var [Xp,Z1]=t2;
        if (equal(dom(Xp),"ω")); //5-1-9-1
        var Zp=format["E(ε(0)×(*))"](dom(Xp),inTnot0);
        if (Zp){ //5-1-9-2
          if (equal(Z1,"1")){ //5-1-9-2-1
            if (equal(Zp,"1")){ //5-1-9-2-1-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format["ε([*])×(*)"](inAT,equal("1")));
              if (t3){ //5-1-9-2-1-1-1
                var [G,_1]=t3;
              }
              else; //5-1-9-2-1-1-2
            }
            else{ //5-1-9-2-1-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format["ε([*])×(*)"](inAT,equal("1")));
              if (t3){ //5-1-9-2-1-2-1
                var [G,_1]=t3;
              }
              else; //5-1-9-2-1-2-2
            }
          }
          else{ //5-1-9-2-2
            if (equal(Zp,"1")){ //5-1-9-2-2-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //5-1-9-2-2-1-1
                var [_C,G,_1]=t3;
              }
              else; //5-1-9-2-2-1-2
            }
            else{ //5-1-9-2-2-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //5-1-9-2-2-2-1
                var [_C,G,_1]=t3;
              }
              else; //5-1-9-2-2-2-2
            }
          }
        }
        var t3=format["E(ε(0)×(*)+*)"](dom(Xp),inTnot0,inRT);
        if (t3){ //5-1-9-3
          var [Zp,Rp]=t3;
          if (equal(Z1,"1")){ //5-1-9-3-1
            var t4=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format["ε([*])×(*)"](inAT,equal("1")));
            if (t4){ //5-1-9-3-1-1
              var [G,_1]=t4;
            }
            else; //5-1-9-3-1-2
          }
          else{ //5-1-9-3-2
            var t4=format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
            if (isNat(Y)&&t4){ //5-1-9-3-2-1
              var [_C,G,_1]=t4;
            }
            else; //5-1-9-3-2-2
          }
        }
        var Rp=format["E(*)"](dom(Xp),inRT);
        if (Rp){ //5-1-9-4
          if (equal(Z1,"1")){ //5-1-9-4-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format["ε([*])×(*)"](inAT,equal("1")));
            if (t3){ //5-1-9-4-1-1
              var [G,_1]=t3;
            }
            else; //5-1-9-4-1-2
          }
          else{ //5-1-9-4-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //5-1-9-4-2-1
              var [_C,G,_1]=t3;
            }
            else; //5-1-9-4-2-2
          }
        }
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](inAT,inTnot0));
      if (t2){ //5-1-10
        var [R1,Xp,Z1]=t2;
        if (equal(dom(Xp),"ω")); //5-1-10-1
        var Zp=format["E(ε(0)×(*))"](dom(Xp),inTnot0);
        if (Zp){ //5-1-10-2
          if (equal(Z1,"1")){ //5-1-10-2-1
            if (equal(Zp,"1")){ //5-1-10-2-1-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //5-1-10-2-1-1-1
                var [G,_1]=t3;
              }
              else; //5-1-10-2-1-1-2
            }
            else{ //5-1-10-2-1-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //5-1-10-2-1-2-1
                var [G,_1]=t3;
              }
              else; //5-1-10-2-1-2-2
            }
          }
          else{ //5-1-10-2-2
            if (equal(Zp,"1")){ //5-1-10-2-2-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
              if (t3){ //5-1-10-2-2-1-1
                var [_C,G,_1]=t3;
              }
              else; //5-1-10-2-2-1-2
            }
            else{ //5-1-10-2-2-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
              if (t3){ //5-1-10-2-2-2-1
                var [_C,G,_1]=t3;
              }
              else; //5-1-10-2-2-2-2
            }
          }
        }
        var t3=format["E(ε(0)×(*)+*)"](dom(Xp),inTnot0,inRT);
        if (t3){ //5-1-10-3
          var [Zp,Rp]=t3;
          if (equal(Z1,"1")){ //5-1-10-3-1
            var t4=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t4){ //5-1-10-3-1-1
              var [G,_1]=t4;
            }
            else; //5-1-10-3-1-2
          }
          else{ //5-1-10-3-2
            var t4=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
            if (t4){ //5-1-10-3-2-1
              var [_C,G,_1]=t4;
            }
            else; //5-1-10-3-2-2
          }
        }
        var Rp=format["E(*)"](dom(Xp),inRT);
        if (Rp){ //5-1-10-4
          if (equal(Z1,"1")){ //5-1-10-4-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //5-1-10-4-1-1
              var [G,_1]=t3;
            }
            else; //5-1-10-4-1-2
          }
          else{ //5-1-10-4-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
            if (t3){ //5-1-10-4-2-1
              var [_C,G,_1]=t3;
            }
            else; //5-1-10-4-2-2
          }
        }
      }
    }
    if (equal(dom(X2),"1")){ //5-2
      return normalizeAbbreviations("ω");
      if (equal(R,"ε([A])×(1)")){ //5-2-1
        if (isNat(Y)); //5-2-1-1
        else; //5-2-1-2
      }
      var t2=format["*+*"](R,inRT,equal("ε([A])×(1)"));
      if (t2){ //5-2-2
        var [Rp,_C]=t2;
        if (isNat(Y)); //5-2-2-1
        else; //5-2-2-2
      }
      var t2=format["ε([*])×(*)"](R,equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //5-2-3
        var [_A,Z1]=t2;
        if (isNat(Y)); //5-2-3-1
        else; //5-2-3-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //5-2-4
        var [Rp,_A,Z1]=t2;
        if (isNat(Y)); //5-2-4-1
        else; //5-2-4-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1"));
      if (t2){ //5-2-5
        var [Xp,_A,_1]=t2;
        if (isNat(Y)); //5-2-5-1
        else; //5-2-5-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")));
      if (t2){ //5-2-6
        var [Rp,Xp,_A,_1]=t2;
        if (isNat(Y)); //5-2-6-1
        else; //5-2-6-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //5-2-7
        var [Xp,_A,Z1]=t2;
        if (isNat(Y)); //5-2-7-1
        else; //5-2-7-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //5-2-8
        var [Rp,Xp,_A,Z1]=t2;
        if (isNat(Y)); //5-2-8-1
        else; //5-2-8-2
      }
      if (true){ //5-2-9
        if (isNat(Y)); //5-2-9-1
        else; //5-2-9-2
      }
    }
    if (equal(dom(X2),"ω")) return normalizeAbbreviations("ω"); //5-3
    if (["0","1","ω"].every(notEqual(dom(X2)))){ //5-4
      if (lessThan(X,dom(X2))){ //5-4-1
        return normalizeAbbreviations("ω");
        if (equal(X2,"A")){ //5-4-1-1
          var t2=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t2){ //5-4-1-1-1
            var [_R,G]=t2;
          }
          else; //5-4-1-1-2
        }
        var t2=format["*+*"](X2,inAT,equal("A"));
        if (t2){ //5-4-1-2
          var [Xp2,_A]=t2;
          var t3=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t3){ //5-4-1-2-1
            var [_R,G]=t3;
          }
          else; //5-4-1-2-2
        }
        if (equal(dom(X2),"A")){ //5-4-1-3
          var t2=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t2){ //5-4-1-3-1
            var [_R,G]=t2;
          }
          else; //5-4-1-3-2
        }
        var Zp=format["E(ε(0)×(*))"](dom(X2),function(t){return t!="0"&&t!="1"&&inT(t);});
        if (Zp){ //5-4-1-4
          var t2=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t2){ //5-4-1-4-1
            var [_R,G]=t2;
          }
          else; //5-4-1-4-2
        }
        var t2=format["E(ε(0)×(*)+*)"](dom(X2),inTnot0,inRT);
        if (t2){ //5-4-1-5
          var [Zp,Rp]=t2;
          var t3=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t3){ //5-4-1-5-1
            var [_R,G]=t3;
          }
          else; //5-4-1-5-2
        }
        var Rp=format["E(*)"](dom(X2),inRT);
        if (Rp){ //5-4-1-6
          var t2=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t2){ //5-4-1-6-1
            var [_R,G]=t2;
          }
          else; //5-4-1-6-2
        }
      }
      else return dom(X2); //5-4-2
    }
  }
  var Z=format["E(ε(0)×(*))"](X,inTnot0);
  if (Z){ //6
    if (equal(dom(Z),"1")){ //6-1
      return X+"";
      if (equal(Y,"0")); //6-1-1
      if (isNat(Y)); //6-1-2
      if (true); //6-1-3
    }
    else return dom(Z); //6-2
  }
  var t1=format["E(ε(0)×(*)+*)"](X,inTnot0,inRT);
  if (t1){ //7
    var [Z,R]=t1;
    var t2=format["*×(*)"](R,inPRT,inTnot0);
    if (t2){ //7-1
      var [R1,Zp]=t2;
      if (equal(dom(Zp),"1")){ //7-1-1
        return X+"";
        if (equal(Y,"0")); //7-1-1-1
        if (isNat(Y)); //7-1-1-2
        if (true); //7-1-1-3
      }
      else return dom(Zp); //7-1-2
    }
    var t2=format.nest(R,format["*+*"],inRT,format["*×(*)"](inPRT,inTnot0));
    if (t2){ //7-2
      var [Rp,R1,Zp]=t2;
      if (equal(dom(Zp),"1")){ //7-2-1
        return X+"";
        if (equal(Y,"0")); //7-2-1-1
        if (isNat(Y)); //7-2-1-2
        if (true); //7-2-1-3
      }
      else return dom(Zp); //7-2-2
    }
  }
  var R=format["E(*)"](X,inRT);
  if (R){ //8
    var t1=format["*×(*)"](R,inPRT,inTnot0);
    if (t1){ //8-1
      var [R1,Zp]=t1;
      if (equal(dom(Zp),"1")){ //8-1-1
        return X+"";
        if (equal(Y,"0")); //8-1-1-1
        if (isNat(Y)); //8-1-1-2
        if (true); //8-1-1-3
      }
      else return dom(Zp); //8-1-2
    }
    var t1=format.nest(R,format["*+*"],inRT,format["*×(*)"](inPRT,inTnot0));
    if (t1){ //8-2
      var [Rp,R1,Zp]=t1;
      if (equal(dom(Zp),"1")){ //8-2-1
        return X+"";
        if (equal(Y,"0")); //8-2-1-1
        if (isNat(Y)); //8-2-1-2
        if (true); //8-2-1-3
      }
      else return dom(Zp); //8-2-2
    }
  }
  var Xs=isSumAndTermsSatisfy(X,inPT);
  if (Xs){ //9
    var m=Xs.length;
    var X1=Xs[0];
    var Xm=Xs[m-1];
    return dom(Xm);
    var XmFund=fund(Xm,Y);
    if (equal(XmFund,"0")&&m==2); //9-1
    if (equal(XmFund,"0")&&m>2); //9-2
    if (inPT(Xm)); //9-3
    var Zs=isSumAndTermsSatisfy(XmFund,inT);
    if (Zs){ //9-4
      var mp=Zs.length;
    }
  }
  throw Error("No rule to compute dom of "+X);
}
function fund(X,Y){
  X=Term(X);
  if (typeof Y=="number") Y=String(Y);
  Y=Term(Y);
  if (!inT(X)||!inT(Y)) throw Error("Invalid argument: "+X+","+Y);
  if (equal(X,"0")) return "0"; //1
  if (equal(X,"1")) return "0"; //2
  var t1=format["EE_*(*)"](X,inAAT,inT);
  if (t1){ //3
    var [X1,X2]=t1;
    if (equal(X1,"A")){ //3-1
      if (equal(dom(X2),"0")){ //3-1-1
        if (isNat(Y)) return "1+"+fund(X,fund(Y,"0")); //3-1-1-1
        else return "1"; //3-1-1-2
      }
      if (equal(dom(X2),"1")){ //3-1-2
        if (isNat(Y)) return "EE_{"+X1+"}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //3-1-2-1
        else return "EE_{"+X1+"}("+fund(X2,"0")+")"; //3-1-2-2
      }
      if (equal(dom(X2),"ω")) return "EE_{"+X1+"}("+fund(X2,Y)+")"; //3-1-3
      if (["0","1","ω"].every(notEqual(dom(X2)))){ //3-1-4
        if (lessThan(X,dom(X2))){ //3-1-4-1
          if (equal(X2,"A")){ //3-1-4-1-1
            var t2=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t2){ //3-1-4-1-1-1
              var [_X1,G]=t2;
              return "EE_{"+X1+"}("+fund(X2,"EE_{"+X2+"}("+G+")")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"EE_{"+X2+"}(0)")+")"; //3-1-4-1-1-2
          }
          var t2=format["*+*"](X2,inAT,equal("A"));
          if (t2){ //3-1-4-1-2
            var [Xp2,_A]=t2;
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-1-4-1-2-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"EE_{"+X2+"}("+G+")")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"EE_{"+X2+"}(0)")+")"; //3-1-4-1-2-2
          }
          if (equal(dom(X2),"A")){ //3-1-4-1-3
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-1-4-1-3-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"E(ε(["+G+"])×(1))")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"E(ε([A])×(1))")+")"; //3-1-4-1-3-2
          }
          var Z=format["E(ε(0)×(*))"](dom(X2),function(t){return t!="0"&&t!="1"&&inT(t);});
          if (Z){ //3-1-4-1-4
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-1-4-1-4-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"E(ε(0)×("+fund(Z,"0")+")+ε(["+G+"])×(1))")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"E(ε(0)×("+fund(Z,"0")+"))")+")"; //3-1-4-1-4-2
          }
          var t2=format["E(ε(0)×(*)+*)"](dom(X2),inTnot0,inRT);
          if (t2){ //3-1-4-1-5
            var [Z,R]=t2;
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-1-4-1-5-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"EE_{"+dom(X2)+"}("+G+")")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"EE_{"+dom(X2)+"}(0)")+")"; //3-1-4-1-5-2
          }
          var R=format["E(*)"](dom(X2),inRT);
          if (R){ //3-1-4-1-6
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-1-4-1-6-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"EE_{"+dom(X2)+"}("+G+")")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"EE_{"+dom(X2)+"}(0)")+")"; //3-1-4-1-6-2
          }
        }
        else return "EE_{"+X1+"}("+fund(X2,"EE_{"+dom(X2)+"}(0)")+")"; //3-1-4-2
      }
    }
    var t2=format["*+*"](X1,inAT,equal("A"));
    if (t2){ //3-2
      var [Xp1,_A]=t2;
      if (equal(dom(X2),"0")){ //3-2-1
        if (isNat(Y)) return "E(ε(["+Xp1+"])×("+fund(X,fund(Y,"0"))+"))"; //3-2-1-1
        else return "E(ε(["+Xp1+"])×(1))"; //3-2-1-2
      }
      if (equal(dom(X2),"1")){ //3-2-2
        if (isNat(Y)) return "E(ε(["+Xp1+"])×("+fund(X,fund(Y,"0"))+"))"; //3-2-2-1
        else return "EE_{"+X1+"}("+fund(X2,"0")+")+1"; //3-2-2-2
      }
      if (equal(dom(X2),"ω")) return "EE_{"+X1+"}("+fund(X2,Y)+")"; //3-2-3
      if (["0","1","ω"].every(notEqual(dom(X2)))){ //3-2-4
        if (lessThan(X,dom(X2))){ //3-2-4-1
          if (equal(X2,"A")){ //3-2-4-1-1
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-1-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"EE_{"+X2+"}("+G+")")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"EE_{"+X2+"}(0)")+")"; //3-2-4-1-1-2
          }
          var t3=format["*+*"](X2,inAT,equal("A"));
          if (t3){ //3-2-4-1-2
            var [Xp2,_A]=t3;
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-2-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"EE_{"+X2+"}("+G+")")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"EE_{"+X2+"}(0)")+")"; //3-2-4-1-2-2
          }
          if (equal(dom(X2),"A")){ //3-2-4-1-3
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-3-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"E(ε(["+G+"])×(1))")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"E(ε([A])×(1))")+")";; //3-2-4-1-3-2
          }
          var Z=format["E(ε(0)×(*))"](dom(X2),function(t){return t!="0"&&t!="1"&&inT(t);});
          if (Z){ //3-2-4-1-4
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-4-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"E(ε(0)×("+fund(Z,"0")+")+ε(["+G+"])×(1))")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"E(ε(0)×("+fund(Z,"0")+")")+")"; //3-2-4-1-4-2
          }
          var t3=format["E(ε(0)×(*)+*)"](dom(X2),inTnot0,inRT);
          if (t3){ //3-2-4-1-5
            var [Z,R]=t3;
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-5-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"EE_{"+dom(X2)+"}("+G+")")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"EE_{"+dom(X2)+"}(0)")+")"; //3-2-4-1-5-2
          }
          var R=format["E(*)"](dom(X2),inRT);
          if (R){ //3-2-4-1-6
            var t1=isNat(Y)&&format["EE_*(*)"](fund(X,fund(Y,"0")),equal(X1),inT);
            if (t1){ //3-2-4-1-6-1
              var [_X1,G]=t1;
              return "EE_{"+X1+"}("+fund(X2,"EE_{"+dom(X2)+"}("+G+")")+")";
            }
            else return "EE_{"+X1+"}("+fund(X2,"EE_{"+dom(X2)+"}(0)")+")"; //3-2-4-1-6-2
          }
        }
        else return "EE_{"+X1+"}("+fund(X2,Y)+")"; //3-2-4-2
      }
    }
  }
  var t1=format["EE_{E(ε(0)×(*)+*)}(*)"](X,inTnot0,inRT,inT);
  if (t1){ //4
    var [Z,R,X2]=t1;
    if (equal(dom(X2),"0")){ //4-1
      if (equal(R,"ε([A])×(1)")){ //4-1-1
        if (isNat(Y)) return "E(ε(0)×("+Z+"))+"+fund(X,fund(Y,"0")); //4-1-1-1
        else return "E(ε(0)×("+Z+"))"; //4-1-1-2
      }
      var t2=format["*+*"](R,inRT,equal("ε([A])×(1)"));
      if (t2){ //4-1-2
        var [Rp,_C]=t2;
        var t3=format.nest(Rp,format["ε([*])×(*)"],inAT,format.nest(format["EE_{E(ε(0)×(*)+*)}(*)"],equal(Z),format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")),inT));
        if (t3&&equal(t3[0],t3[2])){ //4-1-2-1
          var [Xp,Z,Xp,_A,_1,Xp2]=t3;
          if (isNat(Y)) return "EE_{E(ε(0)×("+Z+")+ε(["+Xp+"+A])×(1))}("+Xp2+")+"+fund(X,fund(Y,"0")); //4-1-2-1-1
          else return "EE_{E(ε(0)×("+Z+")+ε(["+Xp+"+A])×(1))}("+Xp2+")"; //4-1-2-1-2
        }
        var t3=format.nest(Rp,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],inAT,format.nest(format["EE_{E(ε(0)×(*)+*)}(*)"],equal(Z),format.nest(format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0)),inT)));
        if (t3&&equal(t3[1],t3[4])){ //4-1-2-2
          var [Rpp,Xp,Z,Rppp,Xp,_A,Zp,Xp2]=t3;
          if (isNat(Y)) return "EE_{E(ε(0)×("+Z+")+"+Rppp+"+ε(["+Xp+"+A])×("+Zp+"))}("+Xp2+")+"+fund(X,fund(Y,"0")); //4-1-2-2-1
          else return "EE_{E(ε(0)×("+Z+")+"+Rppp+"+ε(["+Xp+"+A])×("+Zp+"))}("+Xp2+")"; //4-1-2-2-2
        }
        if (true){ //4-1-2-3
          if (isNat(Y)) return "E(ε(0)×("+Z+")+"+Rp+")+"+fund(X,fund(Y,"0")); //4-1-2-3-1
          else return "E(ε(0)×("+Z+")+"+Rp+")"; //4-1-2-3-2
        }
      }
      var t2=format["ε([*])×(*)"](R,equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //4-1-3
        var [_A,Z1]=t2;
        var t3=format.nest(Z1,format["*+*"],format["EE_{E(ε(0)×(*)+*)}(*)"](equal(Z),equal("ε([A+A])×(1)"),inT),equal("1"));
        if (t3){ //4-1-3-1
          var [_Z,_C,Xp2,_1]=t3;
          if (isNat(Y)) return "EE_{E(ε(0)×("+Z+")+ε([A+A])×(1))}("+Xp2+")+"+fund(X,fund(Y,"0")); //4-1-3-1-1
          else return "EE_{E(ε(0)×("+Z+")+ε([A+A])×(1))}("+Xp2+")"; //4-1-3-1-2
        }
        else{ //4-1-3-2
          if (isNat(Y)) return "E(ε(0)×("+Z+")+ε([A])×("+fund(Z1,"0")+"))+"+fund(X,fund(Y,"0")); //4-1-3-2-1
          else return "E(ε(0)×("+Z+")+ε([A])×("+fund(Z1,"0")+"))"; //4-1-3-2-2
        }
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //4-1-4
        var [Rp,_A,Z1]=t2;
        var t3=format.nest(Z1,format["*+*"],format.nest(format["EE_{E(ε(0)×(*)+*)}(*)"],equal(Z),format.nest(format["*+*"],inRT,format["ε([*])×(*)"](equal("A+A"),inTnot0),inT)),equal("1"));
        if (t3){ //4-1-4-1
          var [_Z,Rpp,_C,Zp1,Xp2,_1]=t3;
          if (isNat(Y)) return "EE_{E(ε(0)×("+Z+")+"+Rpp+"+ε([A+A])×("+Zp1+"))}("+Xp2+")+"+fund(X,fund(Y,"0")); //4-1-4-1-1
          else return "EE_{E(ε(0)×("+Z+")+"+Rpp+"+ε([A+A])×("+Zp1+"))}("+Xp2+")"; //4-1-4-1-2
        }
        else{ //4-1-4-2
          if (isNat(Y)) return "E(ε(0)×("+Z+")+"+Rp+"+ε([A])×("+fund(Z1,"0")+"))+"+fund(X,fund(Y,"0")); //4-1-4-2-1
          else return "E(ε(0)×("+Z+")+"+Rp+"+ε([A])×("+fund(Z1,"0")+"))"; //4-1-4-2-2
        }
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1"));
      if (t2){ //4-1-5
        var [Xp,_A,_1]=t2;
        if (isNat(Y)) return "E(ε(0)×("+Z+")+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //4-1-5-1
        else return "E(ε(0)×("+Z+")+ε(["+Xp+"])×(1))"; //4-1-5-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")));
      if (t2){ //4-1-6
        var [Rp,Xp,_A,_1]=t2;
        if (isNat(Y)) return "E(ε(0)×("+Z+")+"+Rp+"+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //4-1-6-1
        else return "E(ε(0)×("+Z+")+"+Rp+"+ε(["+Xp+"])×(1))"; //4-1-6-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //4-1-7
        var [Xp,_A,Z1]=t2;
        if (isNat(Y)) return "E(ε(0)×("+Z+")+ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //4-1-7-1
        else return "E(ε(0)×("+Z+")+ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×(1))"; //4-1-7-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //4-1-8
        var [Rp,Xp,_A,Z1]=t2;
        if (isNat(Y)) return "E(ε(0)×("+Z+")+"+Rp+"+ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //4-1-8-1
        else return "E(ε(0)×("+Z+")+"+Rp+"+ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×(1))"; //4-1-8-2
      }
      var t2=format["ε([*])×(*)"](R,inAT,inTnot0);
      if (t2){ //4-1-9
        var [Xp,Z1]=t2;
        if (equal(dom(Xp),"ω")) return "E(ε(0)×("+Z+")+ε(["+fund(Xp,Y)+"])×("+Z1+"))"; //4-1-9-1
        var Zp=format["E(ε(0)×(*))"](dom(Xp),inTnot0);
        if (Zp){ //4-1-9-2
          if (equal(Z1,"1")){ //4-1-9-2-1
            if (equal(Zp,"1")){ //4-1-9-2-1-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format["ε([*])×(*)"](inAT,equal("1")));
              if (t3){ //4-1-9-2-1-1-1
                var [_Z,G,_1]=t3;
                return "E(ε(0)×("+Z+")+ε(["+fund(Xp,"E(ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(0)×("+Z+")+ε(["+fund(Xp,"E(ε([A])×(1))")+"])×(1))"; //4-1-9-2-1-1-2
            }
            else{ //4-1-9-2-1-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format["ε([*])×(*)"](inAT,equal("1")));
              if (t3){ //4-1-9-2-1-2-1
                var [_Z,G,_1]=t3;
                return "E(ε(0)×("+Z+")+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+")+ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(0)×("+Z+")+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+"))")+"])×(1))"; //4-1-9-2-1-2-2
            }
          }
          else{ //4-1-9-2-2
            if (equal(Zp,"1")){ //4-1-9-2-2-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //4-1-9-2-2-1-1
                var [_Z,_C,G,_1]=t3;
                return "E(ε(0)×("+Z+")+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(0)×("+Z+")+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε([A])×(1))")+"])×(1))"; //4-1-9-2-2-1-2
            }
            else{ //4-1-9-2-2-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //4-1-9-2-2-2-1
                var [_Z,_C,G,_1]=t3;
                return "E(ε(0)×("+Z+")+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+")+ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(0)×("+Z+")+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+"))")+"])×(1))"; //4-1-9-2-2-2-2
            }
          }
        }
        var t3=format["E(ε(0)×(*)+*)"](dom(Xp),inTnot0,inRT);
        if (t3){ //4-1-9-3
          var [Zp,Rp]=t3;
          if (equal(Z1,"1")){ //4-1-9-3-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format["ε([*])×(*)"](inAT,equal("1")));
            if (t3){ //4-1-9-3-1-1
              var [_Z,G,_1]=t3;
              return "E(ε(0)×("+Z+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(0)×("+Z+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //4-1-9-3-1-2
          }
          else{ //4-1-9-3-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //4-1-9-3-2-1
              var [_Z,_C,G,_1]=t3;
              return "E(ε(0)×("+Z+")+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(0)×("+Z+")+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //4-1-9-3-2-2
          }
        }
        var Rp=format["E(*)"](dom(Xp),inRT);
        if (Rp){ //4-1-9-4
          if (equal(Z1,"1")){ //4-1-9-4-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format["ε([*])×(*)"](inAT,equal("1")));
            if (t3){ //4-1-9-4-1-1
              var [_Z,G,_1]=t3;
              return "E(ε(0)×("+Z+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(0)×("+Z+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //4-1-9-4-1-2
          }
          else{ //4-1-9-4-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //4-1-9-4-2-1-1
              var [_Z,_C,G,_1]=t3;
              return "E(ε(0)×("+Z+")+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(0)×("+Z+")+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //4-1-9-4-2-1-2
          }
        }
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](inAT,inTnot0));
      if (t2){ //4-1-10
        var [R1,Xp,Z1]=t2;
        if (equal(dom(Xp),"ω")) return "E(ε(0)×("+Z+")+"+R1+"+ε(["+fund(Xp,Y)+"])×("+Z1+"))"; //4-1-10-1
        var Zp=format["E(ε(0)×(*))"](dom(Xp),inTnot0);
        if (Zp){ //4-1-10-2
          if (equal(Z1,"1")){ //4-1-10-2-1
            if (equal(Zp,"1")){ //4-1-10-2-1-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //4-1-10-2-1-1-1
                var [_Z,_R1,G,_1]=t3;
                return "E(ε(0)×("+Z+")+"+R1+"+ε(["+fund(Xp,"E(ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(0)×("+Z+")+"+R1+"+ε(["+fund(Xp,"E(ε([A])×(1))")+"])×(1))"; //4-1-10-2-1-1-2
            }
            else{ //4-1-10-2-1-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //4-1-10-2-1-2-1
                var [_Z,_R1,G,_1]=t3;
                return "E(ε(0)×("+Z+")+"+R1+"+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+")+ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(0)×("+Z+")+"+R1+"+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+"))")+"])×(1))"; //4-1-10-2-1-2-2
            }
          }
          else{ //4-1-10-2-2
            if (equal(Zp,"1")){ //4-1-10-2-2-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
              if (t3){ //4-1-10-2-2-1-1
                var [_Z,_R1,_C,G,_1]=t3;
                return "E(ε(0)×("+Z+")+"+R1+"+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(0)×("+Z+")+"+R1+"+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(["+G+"])×(1))")+"])×(1))"; //4-1-10-2-2-1-2
            }
            else{ //4-1-10-2-2-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
              if (t3){ //4-1-10-2-2-2-1
                var [_Z,_R1,_C,G,_1]=t3;
                return "E(ε(0)×("+Z+")+"+R1+"+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+")+ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(0)×("+Z+")+"+R1+"+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+"))")+"])×(1))"; //4-1-10-2-2-2-2
            }
          }
        }
        var t3=format["E(ε(0)×(*)+*)"](dom(Xp),inTnot0,inRT);
        if (t3){ //4-1-10-3
          var [Zp,Rp]=t3;
          if (equal(Z1,"1")){ //4-1-10-3-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //4-1-10-3-1-1
              var [_Z,_R1,G,_1]=t3;
              return "E(ε(0)×("+Z+")+"+R1+"+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(0)×("+Z+")+"+R1+"+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //4-1-10-3-1-2
          }
          else{ //4-1-10-3-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
            if (t3){ //4-1-10-3-2-1-1
              var [_Z,_R1,_C,G,_1]=t3;
              return "E(ε(0)×("+Z+")+"+R1+"+ε(["+Xp+"])×(+"+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(0)×("+Z+")+"+R1+"+ε(["+Xp+"])×(+"+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //4-1-10-3-2-1-2
          }
        }
        var Rp=format["E(*)"](dom(Xp),inRT);
        if (Rp){ //4-1-10-4
          if (equal(Z1,"1")){ //4-1-10-4-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //4-1-10-4-1-1
              var [_Z,_R1,G,_1]=t3;
              return "E(ε(0)×("+Z+")+"+R1+"+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(0)×("+Z+")+"+R1+"+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //4-1-10-4-1-2
          }
          else{ //4-1-10-4-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(ε(0)×(*)+*)"],equal(Z),format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
            if (t3){ //4-1-10-4-2-1-1
              var [_Z,_R1,_C,G,_1]=t3;
              return "E(ε(0)×("+Z+")+"+R1+"+ε(["+Xp+"])×(+"+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(0)×("+Z+")+"+R1+"+ε(["+Xp+"])×(+"+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //4-1-10-4-2-1-2
          }
        }
      }
    }
    if (equal(dom(X2),"1")){ //4-2
      if (equal(R,"ε([A])×(1)")){ //4-2-1
        if (isNat(Y)) return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //4-2-1-1
        else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")"; //4-2-1-2
      }
      var t2=format["*+*"](R,inRT,equal("ε([A])×(1)"));
      if (t2){ //4-2-2
        var [Rp,_C]=t2;
        if (isNat(Y)) return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //4-2-2-1
        else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")"; //4-2-2-2
      }
      var t2=format["ε([*])×(*)"](R,equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //4-2-3
        var [_A,Z1]=t2;
        if (isNat(Y)) return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //4-2-3-1
        else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")"; //4-2-3-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //4-2-4
        var [Rp,_A,Z1]=t2;
        if (isNat(Y)) return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //4-2-4-1
        else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")"; //4-2-4-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1"));
      if (t2){ //4-2-5
        var [Xp,_A,_1]=t2;
        if (isNat(Y)) return "E(ε(0)×("+Z+")+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //4-2-5-1
        else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")+1"; //4-2-5-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")));
      if (t2){ //4-2-6
        var [Rp,Xp,_A,_1]=t2;
        if (isNat(Y)) return "E(ε(0)×("+Z+")+"+Rp+"+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //4-2-6-1
        else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")+1"; //4-2-6-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //4-2-7
        var [Xp,_A,Z1]=t2;
        if (isNat(Y)) return "E(ε(0)×("+Z+")+ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //4-2-7-1
        else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")+1"; //4-2-7-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //4-2-8
        var [Rp,Xp,_A,Z1]=t2;
        if (isNat(Y)) return "E(ε(0)×("+Z+")+"+Rp+"+ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //4-2-8-1
        else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")+1"; //4-2-8-2
      }
      if (true){ //4-2-9
        if (isNat(Y)) return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //4-2-8-1
        else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"0")+")"; //4-2-8-2
      }
    }
    if (equal(dom(X2),"ω")) return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,Y)+")"; //4-3
    if (["0","1","ω"].every(notEqual(dom(X2)))){ //4-4
      if (lessThan(X,dom(X2))){ //4-4-1
        var Zp=format["E(ε(0)×(*))"](dom(X2),function(t){return t!="0"&&t!="1"&&inT(t);});
        if (Zp){ //4-4-1-1
          var t2=isNat(Y)&&format["EE_{E(ε(0)×(*)+(*))}(*)"](fund(X,fund(Y,"0")),equal(Z),equal(R),inT);
          if (t2){ //4-4-1-1-1
            var [_Z,_R,G]=t2;
            return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"E(ε(0)×("+fund(Zp,"0")+")+ε(["+G+"])×(1))")+")";
          }
          else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"E(ε(0)×("+fund(Zp,"0")+"))")+")"; //4-4-1-1-2
        }
        var t2=format["E(ε(0)×(*)+*)"](dom(X2),function(t){return t!="0"&&t!="1"&&inT(t);},inRT);
        if (t2){ //4-4-1-2
          var [Zp,Rp]=t2;
          var t3=isNat(Y)&&format["EE_{E(ε(0)×(*)+(*))}(*)"](fund(X,fund(Y,"0")),equal(Z),equal(R),inT);
          if (t3){ //4-4-1-2-1
            var [_Z,_R,G]=t3;
            return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"EE_{"+dom(X2)+"}("+G+")")+")";
          }
          else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,"EE_{"+dom(X2)+"}(0)")+")"; //4-4-1-2-2
        }
      }
      else return "EE_{E(ε(0)×("+Z+")+"+R+")}("+fund(X2,Y)+")"; //4-4-2
    }
  }
  var t1=format["EE_{E(*)}(*)"](X,inRT,inT);
  if (t1){ //5
    var [R,X2]=t1;
    if (equal(dom(X2),"0")){ //5-1
      if (equal(R,"ε([A])×(1)")){ //5-1-1
        if (isNat(Y)) return "1+"+fund(X,fund(Y,"0")); //5-1-1-1
        else return "1"; //5-1-1-2
      }
      var t2=format["*+*"](R,inRT,equal("ε([A])×(1)"));
      if (t2){ //5-1-2
        var [Rp,_C]=t2;
        var t3=format.nest(Rp,format["ε([*])×(*)"],inAT,format.nest(format["EE_{E(*)}(*)"],format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")),inT));
        if (t3&&equal(t3[0],t3[1])){ //5-1-2-1
          var [Xp,Xp,_A,_1,Xp2]=t3;
          if (isNat(Y)) return "EE_{E(ε(["+Xp+"+A])×(1))}("+Xp2+")+"+fund(X,fund(Y,"0")); //5-1-2-1-1
          else return "EE_{E(ε(["+Xp+"+A])×(1))}("+Xp2+")"; //5-1-2-1-2
        }
        var t3=format.nest(Rp,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],inAT,format.nest(format["EE_{E(*)}(*)"],format.nest(format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),inTnot0)),inT)));
        if (t3&&equal(t3[1],t3[3])){ //5-1-2-2
          var [Rpp,Xp,Rppp,Xp,_A,Zp,Xp2]=t3;
          if (isNat(Y)) return "EE_{E("+Rppp+"+ε(["+Xp+"+A])×(1))}("+Xp2+")+"+fund(X,fund(Y,"0")); //5-1-2-2-1
          else return "EE_{E("+Rppp+"+ε(["+Xp+"+A])×(1))}("+Xp2+")"; //5-1-2-2-2
        }
        if (true){ //5-1-2-3
          if (isNat(Y)) return "E("+Rp+")+"+fund(X,fund(Y,"0")); //5-1-2-3-1
          else return "E("+Rp+")"; //5-1-2-3-2
        }
      }
      var t2=format["ε([*])×(*)"](R,equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //5-1-3
        var [_A,Z1]=t2;
        var t3=format.nest(Z1,format["*+*"],format["EE_*(*)"](equal("E(ε([A+A])×(1))"),inT),equal("1"));
        if (t3){ //5-1-3-1
          var [_C,Xp2,_1]=t3;
          if (isNat(Y)) return "EE_{E(ε([A+A])×(1))}("+Xp2+")+"+fund(X,fund(Y,"0")); //5-1-3-1-1
          else return "EE_{E(ε([A+A])×(1))}("+Xp2+")"; //5-1-3-1-2
        }
        var t3=format.nest(Z1,format["*+*"],format["EE_*(*)"](equal("A+A"),inT),equal("1"));
        if (t3){ //5-1-3-2
          var [_C,Xp2,_1]=t3;
          if (isNat(Y)) return "EE_{A+A}("+Xp2+")+"+fund(X,fund(Y,"0")); //5-1-3-2-1
          else return "EE_{A+A}("+Xp2+")"; //5-1-3-2-2
        }
        if (true){ //5-1-3-3
          if (isNat(Y)) return "E(ε([A])×("+fund(Z1,"0")+"))+"+fund(X,fund(Y,"0")); //5-1-3-3-1
          else return "E(ε([A])×("+fund(Z1,"0")+"))"; //5-1-3-3-2
        }
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //5-1-4
        var [Rp,_A,Z1]=t2;
        var t3=format.nest(Z1,format["*+*"],format.nest(format["EE_{E(*)}(*)"],format.nest(format["*+*"],inRT,format["ε([*])×(*)"](equal("A+A"),inTnot0)),inT),equal("1"));
        if (t3){ //5-1-4-1
          var [Rpp,_C,Zp1,Xp2,_1]=t3;
          if (isNat(Y)) return "EE_{E("+Rpp+"+ε([A+A])×("+Zp1+"))}("+Xp2+")+"+fund(X,fund(Y,"0")); //5-1-4-1-1
          else return "EE_{E("+Rpp+"+ε([A+A])×("+Zp1+"))}("+Xp2+")"; //5-1-4-1-2
        }
        else{ //5-1-4-2
          if (isNat(Y)) return "E("+Rp+"+ε([A])×("+fund(Z1,"0")+"))+"+fund(X,fund(Y,"0")); //5-1-4-2-1
          else return "E("+Rp+"+ε([A])×("+fund(Z1,"0")+"))"; //5-1-4-2-2
        }
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1"));
      if (t2){ //5-1-5
        var [Xp,_A,_1]=t2;
        if (isNat(Y)) return "E(ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //5-1-5-1
        else return "E(ε(["+Xp+"])×(1))"; //5-1-5-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")));
      if (t2){ //5-1-6
        var [Rp,Xp,_A,_1]=t2;
        if (isNat(Y)) return "E("+Rp+"+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //5-1-6-1
        else return "E("+Rp+"+ε(["+Xp+"])×(1))"; //5-1-6-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //5-1-7
        var [Xp,_A,Z1]=t2;
        if (isNat(Y)) return "E(ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //5-1-7-1
        else return "E(ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×(1))"; //5-1-7-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //5-1-8
        var [Rp,Xp,_A,Z1]=t2;
        if (isNat(Y)) return "E("+Rp+"+ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //5-1-8-1
        else return "E("+Rp+"+ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×(1))"; //5-1-8-2
      }
      var t2=format["ε([*])×(*)"](R,inAT,inTnot0);
      if (t2){ //5-1-9
        var [Xp,Z1]=t2;
        if (equal(dom(Xp),"ω")) return "E(ε(["+fund(Xp,Y)+"])×("+Z1+"))"; //5-1-9-1
        var Zp=format["E(ε(0)×(*))"](dom(Xp),inTnot0);
        if (Zp){ //5-1-9-2
          if (equal(Z1,"1")){ //5-1-9-2-1
            if (equal(Zp,"1")){ //5-1-9-2-1-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format["ε([*])×(*)"](inAT,equal("1")));
              if (t3){ //5-1-9-2-1-1-1
                var [G,_1]=t3;
                return "E(ε(["+fund(Xp,"E(ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(["+fund(Xp,"E(ε([A])×(1))")+"])×(1))"; //5-1-9-2-1-1-2
            }
            else{ //5-1-9-2-1-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format["ε([*])×(*)"](inAT,equal("1")));
              if (t3){ //5-1-9-2-1-2-1
                var [G,_1]=t3;
                return "E(ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+")+ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+"))")+"])×(1))"; //5-1-9-2-1-2-2
            }
          }
          else{ //5-1-9-2-2
            if (equal(Zp,"1")){ //5-1-9-2-2-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //5-1-9-2-2-1-1
                var [_C,G,_1]=t3;
                return "E(ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε([A])×(1))")+"])×(1))"; //5-1-9-2-2-1-2
            }
            else{ //5-1-9-2-2-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //5-1-9-2-2-2-1
                var [_C,G,_1]=t3;
                return "E(ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+")+ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E(ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+"))")+"])×(1))"; //5-1-9-2-2-2-2
            }
          }
        }
        var t3=format["E(ε(0)×(*)+*)"](dom(Xp),inTnot0,inRT);
        if (t3){ //5-1-9-3
          var [Zp,Rp]=t3;
          if (equal(Z1,"1")){ //5-1-9-3-1
            var t4=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format["ε([*])×(*)"](inAT,equal("1")));
            if (t4){ //5-1-9-3-1-1
              var [G,_1]=t4;
              return "E(ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //5-1-9-3-1-2
          }
          else{ //5-1-9-3-2
            var t4=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t4){ //5-1-9-3-2-1
              var [_C,G,_1]=t4;
              return "E(ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //5-1-9-3-2-2
          }
        }
        var Rp=format["E(*)"](dom(Xp),inRT);
        if (Rp){ //5-1-9-4
          if (equal(Z1,"1")){ //5-1-9-4-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format["ε([*])×(*)"](inAT,equal("1")));
            if (t3){ //5-1-9-4-1-1
              var [G,_1]=t3;
              return "E(ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //5-1-9-4-1-2
          }
          else{ //5-1-9-4-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //5-1-9-4-2-1
              var [_C,G,_1]=t3;
              return "E(ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E(ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //5-1-9-4-2-2
          }
        }
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](inAT,inTnot0));
      if (t2){ //5-1-10
        var [R1,Xp,Z1]=t2;
        if (equal(dom(Xp),"ω")); //5-1-10-1
        var Zp=format["E(ε(0)×(*))"](dom(Xp),inTnot0);
        if (Zp){ //5-1-10-2
          if (equal(Z1,"1")){ //5-1-10-2-1
            if (equal(Zp,"1")){ //5-1-10-2-1-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //5-1-10-2-1-1-1
                var [G,_1]=t3;
                return "E("+R1+"+ε(["+fund(Xp,"E(ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E("+R1+"+ε(["+fund(Xp,"E(ε([A])×(1))")+"])×(1))"; //5-1-10-2-1-1-2
            }
            else{ //5-1-10-2-1-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
              if (t3){ //5-1-10-2-1-2-1
                var [G,_1]=t3;
                return "E("+R1+"+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+")+ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E("+R1+"+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+"))")+"])×(1))"; //5-1-10-2-1-2-2
            }
          }
          else{ //5-1-10-2-2
            if (equal(Zp,"1")){ //5-1-10-2-2-1
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
              if (t3){ //5-1-10-2-2-1-1
                var [_C,G,_1]=t3;
                return "E("+R1+"+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E("+R1+"+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε([A])×(1))")+"])×(1))"; //5-1-10-2-2-1-2
            }
            else{ //5-1-10-2-2-2
              var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
              if (t3){ //5-1-10-2-2-2-1
                var [_C,G,_1]=t3;
                return "E("+R1+"+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+")+ε(["+G+"])×(1))")+"])×(1))";
              }
              else return "E("+R1+"+ε(["+Xp+"])×("+fund(Z1,"0")+")+ε(["+fund(Xp,"E(ε(0)×("+fund(Zp,"0")+"))")+"])×(1))"; //5-1-10-2-2-2-2
            }
          }
        }
        var t3=format["E(ε(0)×(*)+*)"](dom(Xp),inTnot0,inRT);
        if (t3){ //5-1-10-3
          var [Zp,Rp]=t3;
          if (equal(Z1,"1")){ //5-1-10-3-1
            var t4=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t4){ //5-1-10-3-1-1
              var [G,_1]=t4;
              return "E("+R1+"+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E("+R1+"+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //5-1-10-3-1-2
          }
          else{ //5-1-10-3-2
            var t4=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
            if (t4){ //5-1-10-3-2-1
              var [_C,G,_1]=t4;
              return "E("+R1+"+ε(["+Xp+"])×(+"+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E("+R1+"+ε(["+Xp+"])×(+"+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //5-1-10-3-2-2
          }
        }
        var Rp=format["E(*)"](dom(Xp),inRT);
        if (Rp){ //5-1-10-4
          if (equal(Z1,"1")){ //5-1-10-4-1
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format["ε([*])×(*)"](inAT,equal("1"))));
            if (t3){ //5-1-10-4-1-1
              var [G,_1]=t3;
              return "E("+R1+"+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E("+R1+"+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //5-1-10-4-1-2
          }
          else{ //5-1-10-4-2
            var t3=isNat(Y)&&format.nest(fund(X,fund(Y,"0")),format["E(*)"],format.nest(format["*+*"],equal(R1),format.nest(format["*+*"],equal("ε(["+Xp+"])×("+fund(Z1,"0")+")"),format["ε([*])×(*)"](inAT,equal("1")))));
            if (t3){ //5-1-10-4-2-1
              var [_C,G,_1]=t3;
              return "E("+R1+"+ε(["+Xp+"])×(+"+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}("+G+")")+"])×(1))";
            }
            else return "E("+R1+"+ε(["+Xp+"])×(+"+fund(Z1,"0")+")+ε(["+fund(Xp,"EE_{"+dom(Xp)+"}(0)")+"])×(1))"; //5-1-10-4-2-2
          }
        }
      }
    }
    if (equal(dom(X2),"1")){ //5-2
      if (equal(R,"ε([A])×(1)")){ //5-2-1
        if (isNat(Y)) return "EE_{E("+R+")}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //5-2-1-1
        else return "EE_{E("+R+")}("+fund(X2,"0")+")"; //5-2-1-2
      }
      var t2=format["*+*"](R,inRT,equal("ε([A])×(1)"));
      if (t2){ //5-2-2
        var [Rp,_C]=t2;
        if (isNat(Y)) return "EE_{E("+R+")}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //5-2-2-1
        else return "EE_{E("+R+")}("+fund(X2,"0")+")"; //5-2-2-2
      }
      var t2=format["ε([*])×(*)"](R,equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //5-2-3
        var [_A,Z1]=t2;
        if (isNat(Y)) return "EE_{E("+R+")}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //5-2-3-1
        else return "EE_{E("+R+")}("+fund(X2,"0")+")"; //5-2-3-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format["ε([*])×(*)"](equal("A"),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //5-2-4
        var [Rp,_A,Z1]=t2;
        if (isNat(Y)) return "EE_{E("+R+")}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //5-2-4-1
        else return "EE_{E("+R+")}("+fund(X2,"0")+")"; //5-2-4-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1"));
      if (t2){ //5-2-5
        var [Xp,_A,_1]=t2;
        if (isNat(Y)) return "E(ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //5-2-5-1
        else return "EE_{E("+R+")}("+fund(X2,"0")+")+1"; //5-2-5-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),equal("1")));
      if (t2){ //5-2-6
        var [Rp,Xp,_A,_1]=t2;
        if (isNat(Y)) return "E("+Rp+"+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //5-2-6-1
        else return "EE_{E("+R+")}("+fund(X2,"0")+")+1"; //5-2-6-2
      }
      var t2=format.nest(R,format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);});
      if (t2){ //5-2-7
        var [Xp,_A,Z1]=t2;
        if (isNat(Y)) return "E(ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //5-2-7-1
        else return "EE_{E("+R+")}("+fund(X2,"0")+")+1"; //5-2-7-2
      }
      var t2=format.nest(R,format["*+*"],inRT,format.nest(format["ε([*])×(*)"],format["*+*"](inAT,equal("A")),function(t){return t!="0"&&t!="1"&&inT(t);}));
      if (t2){ //5-2-8
        var [Rp,Xp,_A,Z1]=t2;
        if (isNat(Y)) return "E("+Rp+"+ε(["+Xp+"+A])×("+fund(Z1,"0")+")+ε(["+Xp+"])×("+fund(X,fund(Y,"0"))+"))"; //5-2-8-1
        else return "EE_{E("+R+")}("+fund(X2,"0")+")+1"; //5-2-8-2
      }
      if (true){ //5-2-9
        if (isNat(Y)) return "EE_{E("+R+")}("+fund(X2,"0")+")+"+fund(X,fund(Y,"0")); //5-2-9-1
        else return "EE_{E("+R+")}("+fund(X2,"0")+")"; //5-2-9-2
      }
    }
    if (equal(dom(X2),"ω")) return "EE_{E("+R+")}("+fund(X2,Y)+")"; //5-3
    if (["0","1","ω"].every(notEqual(dom(X2)))){ //5-4
      if (lessThan(X,dom(X2))){ //5-4-1
        if (equal(X2,"A")){ //5-4-1-1
          var t2=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t2){ //5-4-1-1-1
            var [_R,G]=t2;
            return "EE_{E("+R+")}("+fund(X2,"EE_{"+dom(X2)+"}("+G+")")+")";
          }
          else return "EE_{E("+R+")}("+fund(X2,"EE_{"+dom(X2)+"}(0)")+")"; //5-4-1-1-2
        }
        var t2=format["*+*"](X2,inAT,equal("A"));
        if (t2){ //5-4-1-2
          var [Xp2,_A]=t2;
          var t3=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t3){ //5-4-1-2-1
            var [_R,G]=t3;
            return "EE_{E("+R+")}("+fund(X2,"EE_{"+dom(X2)+"}("+G+")")+")";
          }
          else return "EE_{E("+R+")}("+fund(X2,"EE_{"+dom(X2)+"}(0)")+")"; //5-4-1-2-2
        }
        if (equal(dom(X2),"A")){ //5-4-1-3
          var t2=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t2){ //5-4-1-3-1
            var [_R,G]=t2;
            return "EE_{E("+R+")}("+fund(X2,"E(ε(["+G+"])×(1))")+")";
          }
          else return "EE_{E("+R+")}("+fund(X2,"E(ε([A])×(1))")+")"; //5-4-1-3-2
        }
        var Zp=format["E(ε(0)×(*))"](dom(X2),function(t){return t!="0"&&t!="1"&&inT(t);});
        if (Zp){ //5-4-1-4
          var t2=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t2){ //5-4-1-4-1
            var [_R,G]=t2;
            return "EE_{E("+R+")}("+fund(X2,"E(ε(0)×("+fund(Zp,"0")+")+ε(["+G+"])×(1))")+")";
          }
          else return "EE_{E("+R+")}("+fund(X2,"E(ε(0)×("+fund(Zp,"0")+"))")+")"; //5-4-1-4-2
        }
        var t2=format["E(ε(0)×(*)+*)"](dom(X2),inTnot0,inRT);
        if (t2){ //5-4-1-5
          var [Zp,Rp]=t2;
          var t3=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t3){ //5-4-1-5-1
            var [_R,G]=t3;
            return "EE_{E("+R+")}("+fund(X2,"EE_{"+dom(X2)+"}("+G+")")+")";
          }
          else return "EE_{E("+R+")}("+fund(X2,"EE_{"+dom(X2)+"}(0)")+")"; //5-4-1-5-2
        }
        var Rp=format["E(*)"](dom(X2),inRT);
        if (Rp){ //5-4-1-6
          var t2=isNat(Y)&&format["EE_{E(*)}(*)"](fund(X,fund(Y,"0")),equal(R),inT);
          if (t2){ //5-4-1-6-1
            var [_X1,G]=t2;
            return "EE_{E("+R+")}("+fund(X2,"EE_{"+dom(X2)+"}("+G+")")+")";
          }
          else return "EE_{E("+R+")}("+fund(X2,"EE_{"+dom(X2)+"}(0)")+")"; //5-4-1-6-2
        }
      }
      else return "EE_{E("+R+")}("+fund(X2,Y)+")"; //5-4-2
    }
  }
  var Z=format["E(ε(0)×(*))"](X,inTnot0);
  if (Z){ //6
    if (equal(dom(Z),"1")){ //6-1
      if (equal(Y,"0")) return "1"; //6-1-1
      if (isNat(Y)) return Y+"+1"; //6-1-2
      if (true) return Y+""; //6-1-3
    }
    else return "E(ε(0)×("+fund(Z,Y)+"))"; //6-2
  }
  var t1=format["E(ε(0)×(*)+*)"](X,inTnot0,inRT);
  if (t1){ //7
    var [Z,R]=t1;
    var t2=format["*×(*)"](R,inPRT,inTnot0);
    if (t2){ //7-1
      var [R1,Zp]=t2;
      if (equal(dom(Zp),"1")){ //7-1-1
        if (equal(Y,"0")) return "1"; //7-1-1-1
        if (isNat(Y)) return Y+"+1"; //7-1-1-2
        if (true) return Y+""; //7-1-1-3
      }
      else return "E(ε(0)×("+Z+")+"+R1+"×("+fund(Zp,Y)+"))"; //7-1-2
    }
    var t2=format.nest(R,format["*+*"],inRT,format["*×(*)"](inPRT,inTnot0));
    if (t2){ //7-2
      var [Rp,R1,Zp]=t2;
      if (equal(dom(Zp),"1")){ //7-2-1
        if (equal(Y,"0")) return "1"; //7-2-1-1
        if (isNat(Y)) return Y+"+1"; //7-2-1-2
        if (true) return Y+""; //7-2-1-3
      }
      else return "E(ε(0)×("+Z+")+"+Rp+"+"+R1+"×("+fund(Zp,Y)+"))"; //7-2-2
    }
  }
  var R=format["E(*)"](X,inRT);
  if (R){ //8
    var t1=format["*×(*)"](R,inPRT,inTnot0);
    if (t1){ //8-1
      var [R1,Zp]=t1;
      if (equal(dom(Zp),"1")){ //8-1-1
        if (equal(Y,"0")) return "1"; //8-1-1-1
        if (isNat(Y)) return Y+"+1"; //8-1-1-2
        if (true) return Y+""; //8-1-1-3
      }
      else return "E("+R1+"×("+fund(Zp,Y)+"))"; //8-1-2
    }
    var t1=format.nest(R,format["*+*"],inRT,format["*×(*)"](inPRT,inTnot0));
    if (t1){ //8-2
      var [Rp,R1,Zp]=t1;
      if (equal(dom(Zp),"1")){ //8-2-1
        if (equal(Y,"0")) return "1"; //8-2-1-1
        if (isNat(Y)) return Y+"+1"; //8-2-1-2
        if (true) return Y+""; //8-2-1-3
      }
      else return "E("+Rp+"+"+R1+"×("+fund(Zp,Y)+"))"; //8-2-2
    }
  }
  var Xs=isSumAndTermsSatisfy(X,inPT);
  if (Xs){ //9
    var m=Xs.length;
    var X1=Xs[0];
    var Xm=Xs[m-1];
    var XmFund=fund(Xm,Y);
    if (equal(XmFund,"0")&&m==2) return X1+""; //9-1
    if (equal(XmFund,"0")&&m>2) return Xs.slice(0,m-1).join("+"); //9-2
    if (inPT(Xm)) return Xs.slice(0,m-1).join("+")+"+"+fund(Xm,Y); //9-3
    var Zs=isSumAndTermsSatisfy(XmFund,inT);
    if (Zs){ //9-4
      var mp=Zs.length;
      return Xs.slice(0,m-1).join("+")+"+"+Zs.join("+");
    }
  }
  throw Error("No rule to compute dom of "+X);
}
function findOTPath(x,limit){
  x=normalizeAbbreviations(x);
  if (!inT(x)) throw Error("Invalid argument: "+x);
  if (typeof limit=="undefined"||limit==-1) limit=Infinity;
  if (equal(x,"0")){
    return {inOT:true,path:["0"],funds:[-1]};
  }else{
    var n=0;
    var t;
    if (lessThanOrEqual(x,"EE_A(1)")){
      t=normalizeAbbreviations("EE_A(1)");
    }else{
      do{
        n++;
      }while(n<=limit&&!lessThanOrEqual(x,"EE_A("+"A_".repeat(n)+"1)"));
      if (n>limit) return {inOT:undefined,path:[],funds:[]};
      t=normalizeAbbreviations("EE_A("+"A_".repeat(n)+"1)");
    }
    console.log(abbreviate(t));
    var r={inOT:undefined,path:[t],funds:[n]};
    while (!equal(x,t)){
      n=0;
      var nt;
      while (n<=limit&&lessThan(nt=fund(t,n),x)) n++;
      if (n>limit) return r;
      r.path.push(t=nt);
      r.funds.push(n);
      console.log(abbreviate(nt));
    }
    r.inOT=true;
    return r;
  }
}
function inOT(x){
  return findOTPath(x).inOT;
}
function functionF(X,n){
  X=normalizeAbbreviations(X);
  if (!inOT(X)||(typeof n!="number")) throw Error("Invalid argument: "+X);
  if (equal(dom(X),"0")) return n+1; //1
  if (equal(dom(X),"1")){ //2
    var r=n;
    var X0=fund(X,"0");
    for (var i=0;i<n;i++) r=functionF(X0,r);
    return r;
  }
  return functionF(fund(X,n),n); //3
}
function arrow(X,a,b){
  X=normalizeAbbreviations(X);
  if (!inOT(X)||(typeof a!="number")||(typeof b!="number")) throw Error("Invalid argument: "+X);
  if (a==1) return 1; //1
  if (a>1&&b==1) return a; //2
  if (a>1&&equal(dom(X),"0")) return Math.pow(a,b); //3
  if (a>1&&equal(dom(X),"1")&&b>1) return arrow(fund(X,"0"),a,arrow(X,a,b-1)); //4
  return arrow(fund(X,b),a,b);
}
function epsilonGrahamFunction(n){
  if (typeof n!="number") throw Error("Invalid argument");
  return arrow("EE_{E(ε(0)×(1))}("+(n?"A_".repeat(n):"")+"1)",3,3);
}
function calculateGrahamsNumberVerEpsilon010(){
  var r=4;
  for (var i=0;i<64;i++) r=epsilonGrahamFunction(r);
  return r;
}

function testFunction(){
  function f(t,l){var r=findOTPath(t,l||3);console.log(r.inOT);console.log(r.path.map(abbreviate));return r;}
  var l=[
    "EE_A(0)",
    "EE_A(1)",
    "EE_A(2)",
    "EE_A(EE_A(0))",
    "EE_A(EE_A(0)+EE_A(0))",
    "EE_A(A)",
    "EE_A(A+1)",
    "EE_A(A+2)",
    "EE_A(A+EE_{E(ε([A]))}(0))",
    "EE_A(A+EE_{E(ε([A]))}(0)+EE_{E(ε([A]))}(0))",
    "EE_A(A+EE_{E(ε([A]))}(1))",
    "EE_A(A+EE_{E(ε([A]))}(2))",
    "EE_A(A+EE_{E(ε([A]))}(EE_A(0)))",
    "EE_A(A+EE_{E(ε([A]))}(A))",
    "EE_A(A+EE_{E(ε([A]))}(A+1))",
    "EE_A(A+EE_{E(ε([A]))}(A+EE_{E(ε([A]))}(0)))",
    "EE_A(A+E(ε([A])))",
    "EE_A(A+E(ε([A]))+E(ε([A])))",
    "EE_A(A+EE_{E(ε([A])×(2))}(0))",
    "EE_A(A+EE_{E(ε([A])×(2))}(0)+EE_{E(ε([A])×(2))}(0))",
    "EE_A(A+EE_{E(ε([A])×(2))}(1))",
    "EE_A(A+EE_{E(ε([A])×(2))}(A))",
    "EE_A(A+EE_{E(ε([A])×(2))}(A+E(ε([A]))))",
    "EE_A(A+EE_{E(ε([A])×(2))}(A+EE_{E(ε([A])×(2))}(0)))",
    "EE_A(A+E(ε([A])×(2)))",
    "EE_A(A+E(ε([A])×(E(ε([A])×(1)))))",
    "EE_A(A+EE_{A+A}(0))",
    "EE_A(A+EE_{A+A}(0)+EE_{A+A}(0))",
    "EE_A(A+EE_{E(ε([A])×(EE_{A+A}(0)+1))}(0))",
    "EE_A(A+E(ε([A])×(EE_{A+A}(0)+1)))",
    "EE_A(A+EE_{A+A}(1))",
    "EE_A(A+EE_{A+A}(A))",
    "EE_A(A+A)",
    "EE_A(A+A+E(ε([A])))",
    "EE_A(A+A+EE_{E(ε([A+A]))}(0))",
    "EE_A(A+A+EE_{E(ε([A+A]))}(1))",
    "EE_A(A+A+E(ε([A+A])))",
    "EE_A(A+A+E(ε([A+A])+ε([A])))",
    "EE_A(A+A+E(ε([A+A])+ε([A])×(E(ε([A+A])+ε([A]))+1)))",
    "EE_A(A+A+EE_{E(ε([A+A])×(2))}(0))",
    "EE_A(A+A+EE_{E(ε([A+A])+ε([A])×(EE_{E(ε([A+A])×(2))}(0)+1))}(0))",
    "EE_A(A+A+E(ε([A+A])+ε([A])×(EE_{E(ε([A+A])×(2))}(0)+1)))",
    "EE_A(A+A+EE_{E(ε([A+A])×(2))}(1))",
    "EE_A(A+A+E(ε([A+A])×(2)))",
    "EE_A(A+A+EE_{A+A+A}(0))",
    "EE_A(A+A+EE_{E(ε([A+A])×(EE_{A+A+A}(0))+ε([A]))}(0))",
    "EE_A(A+A+E(ε([A+A])×(EE_{A+A+A}(0))+ε([A])))",
    "EE_A(A+A+E(ε([A+A])×(EE_{A+A+A}(0)+1)))",
    "EE_A(A+A+EE_{A+A+A}(1))",
    "EE_A(A+A+A)",
    "EE_A(EE_{E(ε(0)+ε([A]))}(0))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(0)+E(ε([EE_{E(ε(0)+ε([A]))}(0)])))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(0)+A)",
    "EE_A(EE_{E(ε(0)+ε([A]))}(0)+EE_{E(ε(0)+ε([A]))}(0))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(1))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(1)+A)",
    "EE_A(EE_{E(ε(0)+ε([A]))}(1)+EE_{E(ε(0)+ε([A]))}(0))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(1)+EE_{E(ε(0)+ε([A]))}(1))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(2))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(EE_{E(ε([A]))}(0)))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(E(ε([A]))))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(E(ε([EE_{E(ε(0)+ε([A]))}(E(ε([A])))]))))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(A))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(A)+EE_{E(ε(0)+ε([A]))}(E(ε([EE_{E(ε(0)+ε([A]))}(A)]))))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(A)+EE_{E(ε(0)+ε([A]))}(A))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(A+1))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(A+A))",
    "EE_A(EE_{E(ε(0)+ε([A]))}(EE_{E(ε(0)+ε([A]))}(0)))",
    "EE_A(E(ε(0)+ε([A])))",
    "EE_A(E(ε(0)+ε([A])×(2)))",
    "EE_A(E(ε(0)+ε([A])×(E(ε([A])))))",
    "EE_A(E(ε(0)+ε([A])×(A)))",
    "EE_A(E(ε(0)+ε([A])×(E(ε(0)+ε([A])))))",
    "EE_A(EE_{E(ε(0)+ε([A+A]))}(0))",
    "EE_A(E(ε(0)+ε([A+A])))",
    "EE_A(E(ε(0)+ε([EE_{E(ε(0)+ε([A]))}(0)])))",
    "EE_A(A_2)",
    "EE_A(A_2+E(ε(0)+ε([A])))",
    "EE_A(A_2+EE_{E(ε(0)+ε([A_2]))}(0))",
    "EE_A(A_2+E(ε(0)+ε([A_2])))",
    "EE_A(A_2+A_2)",
    "EE_A(E(ε(0)×(2)+ε([A])))",
    "EE_A(E(ε(0)×(2)+ε([A_2])))",
    "EE_A(A_3)",
    "EE_A(A_{E(ε([A]))})",
    "EE_A(A_{E(ε([A_2]))})",
    "EE_A(A_A)",
    "EE_A(A_{E(ε(0)+ε([A]))})",
    "EE_A(A_A_2)",
    "EE_A(A_A_A)"
  ];
  var r={lessThan:[],findOTPath:[],errors:[]};
  for (var i=0;i<l.length;i++){
    for (var j=0;j<l.length;j++){
      console.log("%cTesting: lessThan, "+l[i]+", "+l[j]+".","color:gold");
      var d=Date.now();
      var caught=false;
      try{
        var result=lessThan(l[i],l[j]);
      }catch(e){
        var diff=Date.now()-d;
        r.lessThan.push({arg0:l[i],arg1:l[j],result:e,time:diff});
        r.errors.push({test:"lessThan",arg0:l[i],arg1:l[j],name:"error",content:e});
        console.error(e);
        var caught=true;
      }finally{
        var diff=Date.now()-d;
        if (!caught){
          r.lessThan.push({arg0:l[i],arg1:l[j],result:result,time:diff});
          console.log(diff);
          if (result!=(i<j)){
            r.errors.push({test:"lessThan",arg0:l[i],arg1:l[j],name:"fail"});
            console.error("Failed test: lessThan, "+l[i]+", "+l[j]+", expected "+(i<j)+".");
          }
        }
      }
    }
  }
  for (var i=0;i<l.length;i++){
    console.log("%cTesting: findOTPath, "+l[i]+".","color:gold");
    var d=Date.now();
    var caught=false;
    try{
      var result=findOTPath(l[i],3);
    }catch(e){
      var diff=Date.now()-d;
      r.findOTPath.push({arg0:l[i],result:e,time:diff});
      r.errors.push({test:"findOTPath",arg0:l[i],name:"error",content:e});
      console.error(e);
      caught=true;
    }finally{
      var diff=Date.now()-d;
      if (!caught){
        r.findOTPath.push({arg0:l[i],result:result,time:diff});
        console.log(diff);
        if (!result.inOT){
          r.errors.push({test:"findOTPath",arg0:l[i],name:"fail"});
          console.error("Failed test: findOTPath, "+l[i]+".");
        }
      }
    }
  }
  return r;
}
function JSONStringifyWithError(obj){
  return JSON.stringify(obj,function replaceErrors(key,value){
    if (value instanceof Error){
      var error={};
      Object.getOwnPropertyNames(value).forEach(function (key){error[key]=value[key];});
      return error;
    }
    else return value;
  });
}
function downloadFile(data,filename,type){
  var file=new Blob([data],{type:type});
  var a=document.createElement("a");
  var url=URL.createObjectURL(file);
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);  
  },0); 
}

var input="";
var options={
  abbreviate:undefined,
  detail:undefined
}
var last=null;
function compute(){
  if (input==dg("input").value&&options.abbreviate==dg("abbreviate").checked&&options.detail==dg("detail").checked) return;
  var oldinput=input;
  input=dg("input").value;
  options.abbreviate=dg("abbreviate").checked;
  options.detail=dg("detail").checked;
  if (oldinput!=input) last=[];
  var output="";
  var sets=["inT","inPT","inAT","inAAT","inRT","inPRT","inPAT"];
  var lines=input.split(lineBreakRegex);
  for (var l=0;l<lines.length;l++){
    var line=lines[l];
    var args=line.split(itemSeparatorRegex);
    var cmd=args.shift();
    output+=line+"\n";
    var result;
    if (oldinput!=input){
      try{
        if (cmd=="normalize"||cmd=="norm"){
          result=normalizeAbbreviations(args[0]);
        }else if (cmd=="abbreviate"||cmd=="abbr"){
          result=abbreviate(args[0]);
        }else if (cmd=="lessThan"||cmd=="<"){
          result=lessThan(args[0],args[1]);
        }else if (cmd=="lessThanOrEqual"||cmd=="<="){
          result=lessThanOrEqual(args[0],args[1]);
        }else if (sets.includes(cmd)){
          result=window[cmd](args[0]);
        }else if (cmd=="expand"){
          var t=normalizeAbbreviations(args[0]);
          result=[t];
          for (var i=1;i<args.length;i++){
            result.push(t=fund(t,args[i]));
          }
        }else if (cmd=="inOT"){
          result=findOTPath(args[0],args[1]||3);
        }else{
          result=null;
        }
      }catch(e){
        result=e;
      }
      last[l]=result;
    }else result=last[l];
    if (result instanceof Error){
      output+=result.stack?result.stack:result;
    }else if (cmd=="normalize"||cmd=="norm"){
      output+=result;
    }else if (cmd=="abbreviate"||cmd=="abbr"){
      output+=result;
    }else if (cmd=="lessThan"||cmd=="<"){
      output+=result;
    }else if (cmd=="lessThanOrEqual"||cmd=="<="){
      output+=result;
    }else if (sets.includes(cmd)){
      if (options.detail){
        if (result) output+=(options.abbreviate?abbreviate(args[0]):args[0])+"∈"+cmd;
        else output+=(options.abbreviate?abbreviate(args[0]):args[0])+"∉"+cmd;
      }else output+=result;
    }else if (cmd=="expand"){
      if (options.detail){
        for (var i=1;i<result.length;i++){
          output+=(options.abbreviate?abbreviate(result[i-1]):result[i-1])+"["+args[i]+"]="+(options.abbreviate?abbreviate(result[i]):result[i])+(i==result.length-1?"":"\n");
        }
      }else{
        output+=(options.abbreviate?abbreviate(result[result.length-1]):result[result.length-1]);
      }
    }else if (cmd=="inOT"){
      if (options.detail){
        for (var i=1;i<result.path.length;i++){
          output+=(options.abbreviate?abbreviate(result.path[i-1]):result.path[i-1])+"["+result.funds[i]+"]="+(options.abbreviate?abbreviate(result.path[i]):result.path[i])+"\n";
        }
        if (result.inOT) output+=(options.abbreviate?abbreviate(args[0]):args[0])+"∈OT";
        else output+=(options.abbreviate?abbreviate(args[0]):args[0])+"∉OT limited to n≦"+(args[1]||3);
      }else{
        output+=result.inOT;
      }
    }else{
      output+="Unknown command "+cmd;
    }
    output+="\n\n";
  }
  dg("output").value=output;
}
window.onpopstate=function (e){
  load();
  compute();
}
/*function saveSimple(clipboard){
  var encodedInput=input.split(lineBreakRegex).map(e=>e.split(itemSeparatorRegex).map(parseSequenceElement).map(e=>e.forcedParent?e.value+"v"+e.parentIndex:e.value)).join(";");
  history.pushState(encodedInput,"","?"+encodedInput);
  if (clipboard){
    var copyarea=dg("copyarea");
    copyarea.value=location.href;
    copyarea.style.display="";
    copyarea.select();
    copyarea.setSelectionRange(0,99999);
    document.execCommand("copy");
    copyarea.style.display="none";
  }
}
function saveDetailed(clipboard){
  var state={};
  for (var i of options){
    state[i]=window[i];
  }
  var encodedState=btoa(JSON.stringify(state)).replace(/\+/g,"-").replace(/\//g,"_").replace(/\=/g,"");
  history.pushState(state,"","?"+encodedState);
  if (clipboard){
    var copyarea=dg("copyarea");
    copyarea.value=location.href;
    copyarea.style.display="";
    copyarea.select();
    copyarea.setSelectionRange(0,99999);
    document.execCommand("copy");
    copyarea.style.display="none";
  }
}*/
function load(){/*
  var encodedState=location.search.slice(1);
  if (!encodedState) return;
  try{
    var state=encodedState.replace(/\-/g,"+").replace(/_/g,"/");
    if (state.length%4) state+="=".repeat(4-state.length%4);
    state=JSON.parse(atob(state));
  }catch (e){ //simple
    var input=encodedState.replace(/;/g,"\r\n");
    dg("input").value=input;
  }finally{ //detailed
    console.log(state);
    for (var i of options){
      if (state[i]) dg(i).value=state[i];
    }
  }
*/}
var handlekey=function(e){}
//console.log=function (s){alert(s)};
window.onerror=function (e,s,l,c,o){alert(JSON.stringify(e+"\n"+s+":"+l+":"+c+"\n"+o.stack))};