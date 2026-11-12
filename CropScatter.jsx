/*
    CROP SCATTER v6.2  —  JMV Productions
    Random crop boxes + fake parallax per player, with crop-collage transitions built INTO the players.

    INSTALL
      Copy to  Adobe After Effects <ver>/Scripts/ScriptUI Panels/  (delete older Crop Scatter files there),
      restart AE, open from the Window menu.
      Settings > Scripting & Expressions > enable "Allow Scripts to Write Files and Access Network"
      (only needed for preset Import / Export).

    EACH PLAYER                [CS Player - <name>]  in the main comp, all "CS" controls live on it
        inside:  [CS Crops Front] [Athlete] [CS Crops Behind] [Background]
        inputs (Project panel > Crop Scatter > Players > <name> > Inputs), each at the clip's own size:
            <name> - Full          the full background clip
            <name> - Roto          the rotoscoped athlete
            <name> - Crop Source   what the boxes are cut from. Starts as the Full clip; put any other clip
                                   in here (e.g. a different shot of the same athlete).

    TRANSITIONS                Link players in order. In the last part of clip A, A's own boxes start showing
                               clip B (more boxes, bigger, more of them B as the cut gets closer). In the first
                               part of clip B, B's boxes show clip A and ramp back down to normal.

    BAKE                       Expressions -> keyframes. A live backup is kept in Crop Scatter > Backups.
*/

(function CropScatter(thisObj) {

    var NAME = "Crop Scatter v6.2";
    var P = "CS ";
    var SYNC = "Sync Mode 0=BPM 1=Clip 2=Comp";
    var PMODE = "Parallax 0=Off 1=Push 2=Beat 3=Both";
    var LORDER = "Look Order 0=Random 1=Cycle";
    var TINTPAIR = "Tint Color Set";
    var PACE = "Pacing Mode";
    // old long names -> new (for preset files written by earlier builds)
    var LEGACY_KEYS = { "Tint Colors 0=Set1 1=Set2 2=Random": "Tint Color Set", "Pacing 0=Even 1=SpeedUp 2=SlowDown 3=Middle": "Pacing Mode" };

    //<EXPR>
    function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }

    function miniHeader(mainName, plName) {
        return 'var PL=comp("' + esc(mainName) + '").layer("' + esc(plName) + '");\n' +
               'function g(n){return PL.effect("CS "+n)(1).value;}\n';
    }

    // side: front/back/all.  role: main = this clip's boxes, prev / next = boxes showing the neighbouring clip
    function exprHeader(mainName, plName, idx, side, role) {
        return [
            'var MC=comp("' + esc(mainName) + '");',
            'var PL=MC.layer("' + esc(plName) + '");',
            'function g(n){return PL.effect("CS "+n)(1).value;}',
            'var IDX=' + idx + ', SIDE="' + side + '", ROLE="' + (role || "main") + '";',
            'var T0=time+PL.startTime;',
            'var _ia=PL.sourceTime(PL.inPoint)+PL.startTime, _ib=PL.sourceTime(PL.outPoint)+PL.startTime;',
            'var IN0=Math.min(_ia,_ib), OUT0=Math.max(_ia,_ib);',
            'var TB=T0-(Math.round(g("' + SYNC + '"))==4?0:g("Phase Beats"))*60/Math.max(g("BPM"),1);',
            'var _s=1;',
            'function nr(){_s=(_s*16807)%2147483647;return (_s-1)/2147483646;}',
            'function srand(a,b,c){_s=Math.abs((a*73856093)^(b*19349663)^((c+7)*83492791))%2147483646+1;for(var i=0;i<6;i++){nr();}}',
            'function clampv(v,a,b){return a>b?(a+b)/2:Math.min(Math.max(v,a),b);}',
            'function qz(){return [g("Trans From Prev")>0?0:Math.max(g("Quiet Start s"),0), g("Trans To Next")>0?0:Math.max(g("Quiet End s"),0)];}',
            'function stepInfo(){',
            '  var bpm=Math.max(g("BPM"),1), bpc=Math.max(g("Beats Per Change"),0.0625), dl=60/bpm*bpc;',
            '  var mode=Math.round(g("' + SYNC + '"));',
            '  if(mode==4){',
            '    var q=qz(), qa=IN0+q[0], qb=OUT0-q[1], WW=qb-qa;',
            '    if(WW<0.02||TB<qa||TB>=qb){return [-1,0,1];}',
            '    var pc=Math.round(g("Plan Changes")), nn=pc>0?pc:Math.max(1,Math.round(WW/Math.max(g("Avg Gap s"),0.03)));',
            '    var pj=Math.min(Math.max(g("Gap Random %"),0),100)/100, pm=Math.round(g("' + PACE + '")), sd4=Math.round(g("Seed"));',
            '    function fw(x){if(pm==1){return 1-Math.pow(1-x,2);} if(pm==2){return x*x;} if(pm==3){var y=2*x-1; return 0.5+0.5*(y<0?-1:1)*Math.pow(Math.abs(y),1.8);} return x;}',
            '    function bd(k){if(k<=0){return qa;} if(k>=nn){return qb;} srand(sd4+13,994,k); var x=(k+(nr()-0.5)*pj)/nn; return qa+WW*fw(Math.min(Math.max(x,0),1));}',
            '    var lo=0, hi=nn; while(hi-lo>1){var md=(lo+hi)>>1; if(bd(md)<=TB){lo=md;}else{hi=md;}}',
            '    var s0=bd(lo), s1=bd(lo+1); return [lo,s0,Math.max(s1-s0,0.001)];',
            '  }',
            '  if(mode==3){',
            '    var rmn=Math.max(g("Random Min s"),0.03), rmx=Math.max(g("Random Max s"),rmn), sd=Math.round(g("Seed")), t=IN0;',
            '    if(TB<t){return [-1,0,1];}',
            '    for(var q3=0;q3<5000;q3++){srand(sd+11,996,q3); var dd=rmn+(rmx-rmn)*nr(); if(TB<t+dd){return [q3,t,dd];} t+=dd;}',
            '    return [-1,0,1];',
            '  }',
            '  var M=null; if(mode==1){M=PL.marker;} else if(mode==2){M=MC.marker;}',
            '  if(M!=null&&M.numKeys>0){',
            '    var n=M.nearestKey(TB).index; if(M.key(n).time>TB){n--;}',
            '    if(n<1){return [-1,0,1];}',
            '    var st=M.key(n).time; var ln=(n<M.numKeys)?M.key(n+1).time-st:dl;',
            '    return [n,st,ln];',
            '  }',
            '  var off=g("Beat Offset"); var s=Math.floor((TB-off)/dl+1e-6);',
            '  return [s,off+s*dl,dl];',
            '}',
            // transition zone at time tt: [0 none / 1 start of clip (shows previous clip) / 2 end of clip (shows next clip), strength 0..1 (1 at the cut)]
            'function zoneAt(tt){',
            '  var c=Math.max(g("Ramp Curve"),0.1);',
            '  if(g("Trans From Prev")>0){var zi=Math.max(g("Lead In s"),0.01), u=(tt-IN0)/zi; if(u>=0&&u<1){return [1,1-Math.pow(u,c)];}}',
            '  if(g("Trans To Next")>0){var zo=Math.max(g("Lead Out s"),0.01), v=(OUT0-tt)/zo; if(v>0&&v<=1){return [2,1-Math.pow(v,c)];}}',
            '  return [0,0];',
            '}',
            'var LN=["Normal","Invert","B&W","Tint","Glow"];',
            'function weights(){var w=[];for(var i=0;i<5;i++){w.push(g(LN[i]+" On")>0?Math.max(g(LN[i]+" Weight"),0):0);}return w;}',
            'function pickLook(rv){',
            '  var w=weights(),t=0,i; for(i=0;i<5;i++){t+=w[i];}',
            '  if(t<=0){return 0;}',
            '  var x=rv*t; for(i=0;i<5;i++){if(x<w[i]){return i;} x-=w[i];}',
            '  return 4;',
            '}',
            'function group(step){',
            '  var o={}, sd=Math.round(g("Seed"));',
            '  var ne=Math.max(Math.round(g("Show Every N")),1);',
            '  srand(sd+53,997,step);',
            '  o.show=step>=0&&(step%ne==0)&&nr()*100<g("Show Chance %");',
            '  var ca=Math.max(Math.round(g("Count Min")),0), cb=Math.max(Math.round(g("Count Max")),ca);',
            '  srand(sd+71,995,step); o.n=Math.round(ca+(cb-ca)*nr());',
            '  o.t=cb>ca?(o.n-ca)/(cb-ca):0.5;',
            '  var le=Math.max(Math.round(g("Look Every N")),1), ls=Math.floor(step/le);',
            '  if(Math.round(g("' + LORDER + '"))==1){',
            '    var w=weights(), en=[]; for(var i=0;i<5;i++){if(w[i]>0){en.push(i);}}',
            '    o.look=en.length?en[((ls%en.length)+en.length)%en.length]:0;',
            '  } else {',
            '    srand(sd+31,998,ls); o.look=pickLook(nr());',
            '    if(g("Spread Looks")>0&&ls>0){srand(sd+31,998,ls-1); var pl=pickLook(nr()); srand(sd+37,998,ls); for(var t2=0;t2<6&&o.look==pl;t2++){o.look=pickLook(nr());}}',
            '  }',
            '  return o;',
            '}',
            'function boxLite(j,step,gr,cen,W,H){',
            '  srand(Math.round(g("Seed")),j,step); var r=[]; for(var k=0;k<18;k++){r.push(nr());}',
            '  var mn=g("Min Size %"), mx=Math.max(g("Max Size %"),mn), bias=g("Size Bias %")/100;',
            '  var b=(mx+(mn-mx)*(bias*gr.t+(1-bias)*0.5))*(1+(r[1]-0.5)*2*g("Size Mix %")/100);',
            '  b=Math.min(Math.max(b,mn*0.6),mx*1.15)/100*H;',
            '  var sa=Math.sqrt(Math.max(g("Aspect Ratio"),0.05)), aj=g("Aspect Jitter %")/100*(r[2]-0.5);',
            '  return {x:cen[0]+(r[3]-0.5)*g("Scatter X %")/100*W, y:cen[1]+(r[4]-0.5)*g("Scatter Y %")/100*H,',
            '          w:b*sa*(1+aj), h:b/sa*(1-aj), lk:(r[16]*100<g("Look Mix %"))?pickLook(r[17]):gr.look};',
            '}',
            'function spreadLook(step,gr,nb,cen,W,H){',
            '  var w=weights(), en=[], i, j, k; for(i=0;i<5;i++){if(w[i]>0){en.push(i);}}',
            '  var sp=Math.max(g("Look Spacing"),0), L=[], last=Math.min(IDX,Math.max(nb,1)-1);',
            '  if(en.length<2||IDX>=nb){return boxLite(IDX,step,gr,cen,W,H).lk;}',
            '  function near(a,b){return Math.abs(a.x-b.x)<(a.w+b.w)/2*sp&&Math.abs(a.y-b.y)<(a.h+b.h)/2*sp;}',
            '  for(j=0;j<=last;j++){',
            '    var b=boxLite(j,step,gr,cen,W,H), used={}, clash=false;',
            '    for(k=0;k<L.length;k++){if(near(b,L[k])){used[L[k].lk]=1; if(L[k].lk==b.lk){clash=true;}}}',
            '    if(clash){var st0=0; for(i=0;i<en.length;i++){if(en[i]==b.lk){st0=i;}}',
            '      for(i=1;i<en.length;i++){var c=en[(st0+i)%en.length]; if(!used[c]){b.lk=c; break;}}}',
            '    L.push(b);',
            '  }',
            '  return L[last].lk;',
            '}',
            'function sideOK(rv){if(SIDE!="front"&&SIDE!="back"){return true;} var f=rv*100<g("Front Chance %"); return SIDE=="front"?f:!f;}'
        ].join("\n") + "\n";
    }

    var BOX_FN = [
        'function box(){',
        '  var si=stepInfo(), step=si[0], st=si[1], ln=si[2];',
        '  var zn=zoneAt(T0), env=zn[1], zf=Math.round(g("Zone Change Frames"));',
        '  if(zf>0&&zn[0]>0){',   // faster box changes inside a transition zone
        '    var zd=MC.frameDuration*zf, z0=zn[0]==1?IN0:OUT0-Math.max(g("Lead Out s"),0.01);',
        '    var sub=Math.floor((T0-z0)/zd+1e-6); step=(zn[0]==1?60000:80000)+sub; st=z0+sub*zd-(T0-TB); ln=zd;',
        '  }',
        '  var gr=group(step);',
        '  srand(Math.round(g("Seed")),IDX,step);',
        '  var r=[]; for(var k=0;k<30;k++){r.push(nr());}',
        '  var W=thisLayer.width, H=thisLayer.height, o={};',
        '  o.look=(r[16]*100<g("Look Mix %"))?pickLook(r[17]):gr.look;',
        '  var jit=r[15]*g("Timing Jitter %")/100*ln, el=TB-st-jit, hl=(ln-jit)*g("Hold %")/100;',
        '  var vis=el>=-1e-4&&el<=hl+1e-4, sf=Math.round(g("Strobe Frames"));',
        '  if(sf>0&&vis){vis=Math.floor(el/(sf*MC.frameDuration)+1e-4)%2==0;}',
        '  o.prog=hl>0?Math.min(Math.max(el/hl,0),1):0;',
        '  var qq=qz(), nb=gr.n+Math.round(Math.max(g("Count Boost"),0)*env);',
        '  o.on=g("Enable")>0&&T0>=IN0+qq[0]&&T0<OUT0-qq[1]&&gr.show&&step>=0&&vis&&IDX<nb&&sideOK(r[14]);',
        '  if(o.on&&g("Spread Looks")>0){o.look=spreadLook(step,gr,nb,thisLayer.fromComp(PL.effect("CS Scatter Center")(1).value),W,H);}',
        '  var os=Math.min(Math.max(g("Other Clip Start %"),0),100)/100;',
        '  o.zone=zn[0]; o.other=zn[0]>0&&r[18]<os+(1-os)*env;',
        '  o.on=o.on&&(ROLE=="main"?!o.other:(o.other&&((ROLE=="prev")==(o.zone==1))));',
        '  var mn=g("Min Size %"), mx=Math.max(g("Max Size %"),mn), bias=g("Size Bias %")/100;',
        '  var tgt=mx+(mn-mx)*(bias*gr.t+(1-bias)*0.5);',
        '  var base=tgt*(1+(r[1]-0.5)*2*g("Size Mix %")/100);',
        '  base=Math.min(Math.max(base,mn*0.6),mx*1.15)/100*H;',
        '  base*=1+g("Size Boost %")/100*zoneAt(st+(T0-TB))[1];',
        '  var sa=Math.sqrt(Math.max(g("Aspect Ratio"),0.05)), aj=g("Aspect Jitter %")/100*(r[2]-0.5);',
        '  o.w=Math.max(4,base*sa*(1+aj)); o.h=Math.max(4,base/sa*(1-aj));',
        '  var cen=thisLayer.fromComp(PL.effect("CS Scatter Center")(1).value);',
        '  o.cx=cen[0]+(r[3]-0.5)*g("Scatter X %")/100*W; o.cy=cen[1]+(r[4]-0.5)*g("Scatter Y %")/100*H;',
        '  var sg=Math.round(g("Snap Grid")); if(sg>0){var cw=W/sg, ch=H/sg; o.cx=(Math.floor(o.cx/cw)+0.5)*cw; o.cy=(Math.floor(o.cy/ch)+0.5)*ch;}',
        '  o.cx=clampv(o.cx,o.w/2,W-o.w/2); o.cy=clampv(o.cy,o.h/2,H-o.h/2);',
        '  var ox=0, oy=0;',
        '  if(r[5]*100<g("Offset Chance %")){var a=r[6]*Math.PI*2, m=(0.3+0.7*r[7])*g("Offset Amount %")/100*H; ox=Math.cos(a)*m; oy=Math.sin(a)*m;}',
        '  var da=r[8]*Math.PI*2, dp=g("Drift px")*o.prog; ox+=Math.cos(da)*dp; oy+=Math.sin(da)*dp;',
        '  o.z=(r[9]*100<g("Zoom Chance %"))?1+(g("Zoom Max %")/100-1)*(0.35+0.65*r[10]):1;',
        '  if(Math.abs(o.z)<0.05){o.z=0.05;}',
        '  o.fx=(r[11]*100<g("Flip Chance %"))?-1:1;',
        '  o.hw=o.w/(2*o.z); o.hh=o.h/(2*o.z);',
        '  o.ax=clampv(o.cx-ox,o.hw,W-o.hw); o.ay=clampv(o.cy-oy,o.hh,H-o.hh);',
        '  o.rot=(r[20]*100<g("Tilt Chance %"))?(r[21]-0.5)*2*g("Tilt Max deg"):0;',
        '  var tpm=Math.round(g("' + TINTPAIR + '")); o.tp=tpm==2?(r[24]<0.5?1:0):(tpm==1?1:0);',
        '  o.k=1; var pf=Math.round(g("Pop In Frames"));',
        '  if(pf>0){var px=Math.min(Math.max(el/(pf*MC.frameDuration),0),1), ps=g("Pop Start %")/100; o.k=ps+(1-ps)*(1-Math.pow(1-px,3));}',
        '  return o;',
        '}',
        'var o=box();'
    ].join("\n") + "\n";

    var PAR_FN = [
        'function par(dn){',
        '  var o={z:1,dx:0,dy:0}; var mode=Math.round(g("' + PMODE + '"));',
        '  if(mode<1){return o;}',
        '  var d=g(dn), dur=Math.max(OUT0-IN0,0.001);',
        '  var u=Math.min(Math.max((T0-IN0)/dur,0),1);',
        '  if(g("Parallax Ease")>0){u=u*u*(3-2*u);}',
        '  var push=(mode==1||mode==3)?g("Parallax Amount %")/100*u:0;',
        '  var pun=0;',
        '  if(mode>=2){var si=stepInfo(); if(si[0]>=0&&TB>=si[1]){pun=g("Punch Amount %")/100*Math.exp(-(TB-si[1])/Math.max(g("Punch Decay s"),0.01));}}',
        '  o.z=1+(push+pun)*d;',
        '  o.dx=g("Parallax Drift X px")*u*d; o.dy=g("Parallax Drift Y px")*u*d;',
        '  return o;',
        '}'
    ].join("\n") + "\n";

    // each box is computed ONCE per frame into 3 hidden 3D point controls; every other property just reads them
    // D1 = [on + 2*look + 16*tintSet, centerX, centerY]   D2 = [cropX, cropY, rotation]   D3 = [halfW, halfH, zoom*pop*flip]
    var DATA = {
        D1: '[(o.on?1:0)+2*o.look+16*o.tp,o.cx,o.cy];',
        D2: '[o.ax,o.ay,o.rot];',
        D3: '[o.hw,o.hh,o.z*o.k*o.fx];'
    };
    var READ = 'var d1=effect("CS D1")(1), d2=effect("CS D2")(1), d3=effect("CS D3")(1);\n' +
               'var pk=Math.round(d1[0]), on=pk%2==1, look=Math.floor(pk/2)%8, tp=Math.floor(pk/16);\n';
    var TAIL = {
        mask:     'createPath([[d2[0]-d3[0],d2[1]-d3[1]],[d2[0]+d3[0],d2[1]-d3[1]],[d2[0]+d3[0],d2[1]+d3[1]],[d2[0]-d3[0],d2[1]+d3[1]]],[],[],true);',
        bAnchor:  '[d2[0],d2[1]];',
        bPos:     '[d1[1],d1[2]];',
        bSH:      'Math.abs(d3[2])*100;',
        bSW:      'd3[2]*100;',
        bRot:     'd2[2];',
        invert:   'look==1?0:100;',
        monoAmt:  'look==2?100:0;',
        tintAmt:  'look==3?100:0;',
        tintDark: 'tp==1?g("Tint Dark 2"):g("Tint Dark");',
        tintLight:'tp==1?g("Tint Light 2"):g("Tint Light");',
        bright:   'g("All Brightness")+(look==1?g("Invert Brightness"):(look==2?g("B&W Brightness"):(look==3?g("Tint Brightness"):(look==4?g("Glow Brightness"):0))));',
        contrast: 'g("All Contrast")+(look==1?g("Invert Contrast"):(look==2?g("B&W Contrast"):(look==3?g("Tint Contrast"):(look==4?g("Glow Contrast"):0))));',
        glowInt:  'look==4?g("Glow Intensity"):0;',
        opacity:  'on?g("Opacity %"):0;',
        pScale:   'var q=par(DEPTH); var v=value; v[0]=v[0]*q.z; v[1]=v[1]*q.z; v;',
        pPos:     'var q=par(DEPTH); var v=value; v[0]=v[0]+q.dx; v[1]=v[1]+q.dy; v;'
    };
    //</EXPR>

    // [name, type, default]
    var CONTROLS = [
        ["===== TIMING =====", "sep"],
        ["Enable", "cb", 1],
        ["Seed", "sl", "rand"],
        [SYNC, "sl", 0],
        ["BPM", "sl", 120],
        ["Beat Offset", "sl", 0],
        ["Phase Beats", "sl", 0],
        ["Beats Per Change", "sl", 1],
        ["Random Min s", "sl", 0.15],
        ["Random Max s", "sl", 0.6],
        ["Plan Changes", "sl", 0],
        ["Avg Gap s", "sl", 0.45],
        ["Gap Random %", "sl", 70],
        [PACE, "sl", 0],
        ["Quiet Start s", "sl", 0],
        ["Quiet End s", "sl", 0],
        ["Timing Jitter %", "sl", 0],
        ["Show Every N", "sl", 1],
        ["Show Chance %", "sl", 100],
        ["Hold %", "sl", 100],
        ["Strobe Frames", "sl", 0],
        ["Pop In Frames", "sl", 0],
        ["Pop Start %", "sl", 40],
        ["===== BOXES =====", "sep"],
        ["Count Min", "sl", 2],
        ["Count Max", "sl", 6],
        ["Size Bias %", "sl", 80],
        ["Size Mix %", "sl", 45],
        ["Min Size %", "sl", 10],
        ["Max Size %", "sl", 40],
        ["Aspect Ratio", "sl", 1],
        ["Aspect Jitter %", "sl", 60],
        ["Front Chance %", "sl", 40],
        ["Scatter Center", "pt", "center"],
        ["Scatter X %", "sl", 90],
        ["Scatter Y %", "sl", 90],
        ["Snap Grid", "sl", 0],
        ["Opacity %", "sl", 100],
        ["===== MOTION =====", "sep"],
        ["Offset Chance %", "sl", 60],
        ["Offset Amount %", "sl", 12],
        ["Drift px", "sl", 0],
        ["Zoom Chance %", "sl", 40],
        ["Zoom Max %", "sl", 180],
        ["Flip Chance %", "sl", 15],
        ["Tilt Chance %", "sl", 0],
        ["Tilt Max deg", "sl", 8],
        ["===== LOOKS =====", "sep"],
        [LORDER, "sl", 0],
        ["Look Every N", "sl", 1],
        ["Look Mix %", "sl", 40],
        ["Spread Looks", "cb", 1],
        ["Look Spacing", "sl", 1.5],
        ["Normal On", "cb", 1],
        ["Normal Weight", "sl", 20],
        ["Invert On", "cb", 1],
        ["Invert Weight", "sl", 20],
        ["B&W On", "cb", 1],
        ["B&W Weight", "sl", 20],
        ["Tint On", "cb", 1],
        ["Tint Weight", "sl", 20],
        ["Glow On", "cb", 1],
        ["Glow Weight", "sl", 20],
        ["===== GRADE =====", "sep"],
        ["All Brightness", "sl", 0],
        ["All Contrast", "sl", 0],
        ["Invert Brightness", "sl", 0],
        ["Invert Contrast", "sl", 0],
        ["B&W Brightness", "sl", 0],
        ["B&W Contrast", "sl", 35],
        [TINTPAIR, "sl", 0],
        ["Tint Dark", "col", [0.05, 0.02, 0.2, 1]],
        ["Tint Light", "col", [1, 0.25, 0.65, 1]],
        ["Tint Dark 2", "col", [0.02, 0.06, 0.12, 1]],
        ["Tint Light 2", "col", [1, 0.55, 0.1, 1]],
        ["Tint Brightness", "sl", 0],
        ["Tint Contrast", "sl", 20],
        ["Glow Threshold %", "sl", 55],
        ["Glow Radius", "sl", 40],
        ["Glow Intensity", "sl", 1.5],
        ["Glow Brightness", "sl", 0],
        ["Glow Contrast", "sl", 10],
        ["===== PARALLAX =====", "sep"],
        [PMODE, "sl", 0],
        ["Parallax Amount %", "sl", 15],
        ["Parallax Ease", "cb", 1],
        ["Punch Amount %", "sl", 6],
        ["Punch Decay s", "sl", 0.25],
        ["Depth Background", "sl", 0.35],
        ["Depth Behind", "sl", 0.65],
        ["Depth Subject", "sl", 1.0],
        ["Depth Front", "sl", 1.35],
        ["Parallax Drift X px", "sl", 0],
        ["Parallax Drift Y px", "sl", 0],
        ["===== TRANSITION =====", "sep"],
        ["Trans From Prev", "cb", 0],
        ["Trans To Next", "cb", 0],
        ["Lead In s", "sl", 0.5],
        ["Lead Out s", "sl", 0.5],
        ["Ramp Curve", "sl", 1.5],
        ["Count Boost", "sl", 6],
        ["Size Boost %", "sl", 0],
        ["Other Clip Start %", "sl", 40],
        ["Zone Change Frames", "sl", 0]
    ];
    var MN = { sl: "ADBE Slider Control", cb: "ADBE Checkbox Control", pt: "ADBE Point Control", col: "ADBE Color Control", sep: "ADBE Checkbox Control" };

    // what a preset stores (style only: never the music, seed, position or which clips are linked)
    var PRESET_SKIP = { "Seed": 1, "Enable": 1, "Scatter Center": 1, "BPM": 1, "Beat Offset": 1, "Phase Beats": 1,
                        "Quiet Start s": 1, "Quiet End s": 1, "Trans From Prev": 1, "Trans To Next": 1 };

    var ALL_ON = { "Normal On": 1, "Invert On": 1, "B&W On": 1, "Tint On": 1, "Glow On": 1 };
    var LOOK_PRESETS = {
        "Subtle": { "Count Min": 2, "Count Max": 4, "Size Mix %": 30, "Min Size %": 10, "Max Size %": 28, "Offset Chance %": 40, "Offset Amount %": 8, "Zoom Chance %": 30, "Zoom Max %": 140, "Flip Chance %": 0, "Tilt Chance %": 0, "Hold %": 100, "Strobe Frames": 0, "Timing Jitter %": 0, "Look Mix %": 20, "Normal Weight": 40, "Invert Weight": 5, "B&W Weight": 30, "Tint Weight": 20, "Glow Weight": 5 },
        "Hype":   { "Count Min": 2, "Count Max": 7, "Size Mix %": 45, "Min Size %": 10, "Max Size %": 40, "Offset Chance %": 70, "Offset Amount %": 15, "Zoom Chance %": 50, "Zoom Max %": 200, "Flip Chance %": 20, "Tilt Chance %": 0, "Hold %": 70, "Strobe Frames": 0, "Timing Jitter %": 15, "Look Mix %": 40, "Normal Weight": 15, "Invert Weight": 25, "B&W Weight": 20, "Tint Weight": 20, "Glow Weight": 20 },
        "Chaos":  { "Count Min": 4, "Count Max": 10, "Size Mix %": 70, "Min Size %": 6, "Max Size %": 45, "Offset Chance %": 90, "Offset Amount %": 30, "Zoom Chance %": 70, "Zoom Max %": 300, "Flip Chance %": 40, "Tilt Chance %": 30, "Tilt Max deg": 15, "Hold %": 45, "Strobe Frames": 0, "Timing Jitter %": 40, "Look Mix %": 75, "Normal Weight": 10, "Invert Weight": 30, "B&W Weight": 20, "Tint Weight": 20, "Glow Weight": 20 },
        "Bold":   { "Count Min": 1, "Count Max": 3, "Size Bias %": 100, "Size Mix %": 25, "Min Size %": 25, "Max Size %": 60, "Offset Chance %": 50, "Offset Amount %": 12, "Zoom Chance %": 50, "Zoom Max %": 170, "Flip Chance %": 10, "Tilt Chance %": 0, "Hold %": 90, "Strobe Frames": 0, "Timing Jitter %": 0, "Look Mix %": 35, "Normal Weight": 20, "Invert Weight": 25, "B&W Weight": 25, "Tint Weight": 20, "Glow Weight": 10 },
        "Flash":  { "Count Min": 3, "Count Max": 8, "Size Mix %": 50, "Min Size %": 12, "Max Size %": 38, "Offset Chance %": 0, "Drift px": 0, "Zoom Chance %": 0, "Flip Chance %": 0, "Tilt Chance %": 0, "Hold %": 60, "Strobe Frames": 2, "Timing Jitter %": 25, "Look Mix %": 50, "Normal Weight": 0, "Invert Weight": 30, "B&W Weight": 25, "Tint Weight": 25, "Glow Weight": 20 }
    };
    var TR_PRESETS = {
        "Smooth": { "Lead In s": 0.5, "Lead Out s": 0.5, "Ramp Curve": 1.2, "Count Boost": 5, "Size Boost %": 0, "Other Clip Start %": 30, "Zone Change Frames": 0 },
        "Build":  { "Lead In s": 0.6, "Lead Out s": 0.8, "Ramp Curve": 2, "Count Boost": 10, "Size Boost %": 0, "Other Clip Start %": 40, "Zone Change Frames": 3 },
        "Flicker": { "Lead In s": 0.4, "Lead Out s": 0.4, "Ramp Curve": 1.5, "Count Boost": 8, "Size Boost %": 0, "Other Clip Start %": 60, "Zone Change Frames": 2 }
    };

    // ---------------- helpers (carried over from v5) ----------------
    function getComp() {
        var c = app.project.activeItem;
        if (!(c && c instanceof CompItem)) { alert("Open your main comp first."); return null; }
        return c;
    }
    function fxp(layer) { return layer.property("ADBE Effect Parade"); }
    function getFx(layer, name) { try { return fxp(layer).property(name); } catch (e) { return null; } }
    function isGen(l) { return /^CS_GEN:/.test(l.comment || ""); }
    function isBaked(l) { return (l.comment || "").indexOf("[CS_BAKED]") >= 0; }
    function setBaked(l, on) { var c = (l.comment || "").replace(/\s*\[CS_BAKED\]/g, ""); l.comment = on ? c + " [CS_BAKED]" : c; }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function setExpr(prop, s) { if (prop) { try { prop.expression = s; } catch (e) {} } }
    function findProp(group, keys, idx) {
        if (!group) return null;
        for (var k = 0; k < keys.length; k++) {
            try { var p = group.property(keys[k]); if (p) return p; } catch (e) {}
        }
        try { return idx ? group.property(idx) : null; } catch (e2) { return null; }
    }
    function scalarProp(group, keys, idx) { // only returns a 1D property, so a wrong index can't get a bad expression
        var p = findProp(group, keys, idx);
        try { if (p && p.propertyValueType === PropertyValueType.OneD) return p; } catch (e) {}
        return null;
    }
    function stripCS(layer) {
        var fx = fxp(layer);
        for (var i = fx.numProperties; i >= 1; i--) if (fx.property(i).name.indexOf(P) === 0) fx.property(i).remove();
    }
    function makeId() { return (new Date().getTime()).toString(36) + Math.floor(Math.random() * 46656).toString(36); }
    function uidOf(l) { var m = /\[CS:([a-z0-9]+)\]/.exec(l.comment || ""); return m ? m[1] : null; }
    function uidTR(l) { var m = /\[CSTR:([a-z0-9]+)\]/.exec(l.comment || ""); return m ? m[1] : null; }
    function hasRole(l, r) { return (l.comment || "").indexOf("[CS_ROLE:" + r + "]") >= 0; }
    function setRole(l, r) {
        l.comment = ((l.comment || "").replace(/\s*\[CS_ROLE:\w+\]/g, "") + " [CS_ROLE:" + r + "]").replace(/^\s+/, "");
    }
    function layerByName(comp, n) { for (var i = 1; i <= comp.numLayers; i++) if (comp.layer(i).name === n) return comp.layer(i); return null; }
    function findItem(comment) {
        for (var i = 1; i <= app.project.numItems; i++) { var it = app.project.item(i); if ((it.comment || "").indexOf(comment) === 0) return it; }
        return null;
    }
    function uniqueLayerName(comp, base, selfIndex) {
        function taken(n) {
            for (var i = 1; i <= comp.numLayers; i++) if (comp.layer(i).index !== selfIndex && comp.layer(i).name === n) return true;
            return false;
        }
        if (!taken(base)) return base;
        var k = 2; while (taken(base + " #" + k)) k++;
        return base + " #" + k;
    }
    function ctlSection(name) {
        var sec = "";
        for (var i = 0; i < CONTROLS.length; i++) {
            if (CONTROLS[i][1] === "sep") sec = CONTROLS[i][0].replace(/[=]/g, "").replace(/^\s+|\s+$/g, "");
            else if (CONTROLS[i][0] === name) return sec;
        }
        return "";
    }
    function setCtl(layer, name, v) { var e = getFx(layer, P + name); if (e) { try { e.property(1).setValue(v); } catch (x) {} } }
    function getCtl(layer, name) { var e = getFx(layer, P + name); return e ? e.property(1).value : null; }
    function copyInto(src, comp) {
        src.copyToComp(comp);
        for (var i = 1; i <= comp.numLayers; i++) if (!/^CS_GEN:/.test(comp.layer(i).comment || "")) return comp.layer(i);
        return comp.layer(1);
    }
    function childFolder(parent, n) {
        for (var i = 1; i <= parent.numItems; i++) {
            var it = parent.item(i);
            if (it instanceof FolderItem && it.name === n) return it;
        }
        var f = app.project.items.addFolder(n);
        f.parentFolder = parent;
        return f;
    }
    function centerAnchor(l, notes) {
        var tg = l.property("ADBE Transform Group");
        var ap = tg.property("ADBE Anchor Point"), pos = tg.property("ADBE Position");
        var sc = tg.property("ADBE Scale"), rot = tg.property("ADBE Rotate Z");
        if (ap.numKeys || pos.numKeys || sc.numKeys || rot.numKeys || pos.dimensionsSeparated || ap.expressionEnabled && ap.expression !== "") {
            notes.push(l.name + ": anchor left as-is (it has keyframes/expressions).");
            return;
        }
        var a = ap.value, p = pos.value, s = sc.value, r = rot.value * Math.PI / 180;
        var nx = l.width / 2, ny = l.height / 2;
        var dx = (nx - a[0]) * s[0] / 100, dy = (ny - a[1]) * s[1] / 100;
        var rx = dx * Math.cos(r) - dy * Math.sin(r), ry = dx * Math.sin(r) + dy * Math.cos(r);
        ap.setValue(a.length > 2 ? [nx, ny, a[2]] : [nx, ny]);
        pos.setValue(p.length > 2 ? [p[0] + rx, p[1] + ry, p[2]] : [p[0] + rx, p[1] + ry]);
    }
    function trProps(tr) {
        return {
            anchor: findProp(tr, ["Anchor Point", "ADBE Geometry2-0001"], 1),
            pos: findProp(tr, ["Position", "ADBE Geometry2-0002"], 2),
            sh: findProp(tr, ["Scale Height", "Scale", "ADBE Geometry2-0003"], 4),
            sw: findProp(tr, ["Scale Width", "ADBE Geometry2-0004"], 5),
            rot: scalarProp(tr, ["Rotation", "ADBE Geometry2-0007"], 8)
        };
    }
    function setParallax(layer, mainName, plName, depthName) {
        var H = exprHeader(mainName, plName, 0, "all", "pl") + PAR_FN + 'var DEPTH="' + depthName + '";\n';
        var tg = layer.property("ADBE Transform Group");
        setExpr(tg.property("ADBE Scale"), H + TAIL.pScale);
        if (!tg.property("ADBE Position").dimensionsSeparated) setExpr(tg.property("ADBE Position"), H + TAIL.pPos);
    }
    function clearParallax(layer) {
        var tg = layer.property("ADBE Transform Group");
        try { tg.property("ADBE Scale").expression = ""; } catch (e) {}
        try { tg.property("ADBE Position").expression = ""; } catch (e2) {}
    }
    function removeMainGen(main, uid) {
        var comps = [], n = 0;
        for (var i = main.numLayers; i >= 1; i--) {
            var l = main.layer(i);
            if ((l.comment || "").indexOf("CS_GEN:" + uid + ":") === 0) {
                try { if (l.source instanceof CompItem) comps.push(l.source); } catch (e) {}
                l.locked = false; l.remove(); n++;
            }
        }
        for (var k = 0; k < comps.length; k++) {
            try { if (comps[k].usedIn.length === 0) comps[k].remove(); } catch (e2) {}
        }
        return n;
    }
    function legacyClean(main, l) {
        var c = l.comment || "", re = /\[CS(?:SUB)?:([a-z0-9]+)\]/g, m, n = 0;
        while ((m = re.exec(c)) !== null) n += removeMainGen(main, m[1]);
        stripCS(l);
        l.comment = c.replace(/\s*\[CS(?:SUB)?:[a-z0-9]+\]/g, "").replace(/^\s+|\s+$/g, "");
        return n;
    }
    function dupCompNames(name) {
        var n = 0;
        for (var i = 1; i <= app.project.numItems; i++) { var it = app.project.item(i); if (it instanceof CompItem && it.name === name) n++; }
        return n;
    }
    function autoPairs(sel) {
        var ls = [];
        for (var i = 0; i < sel.length; i++) if (isPlainAV(sel[i])) ls.push(sel[i]);
        ls.sort(function (a, b) { return a.index - b.index; });
        var used = {}, pairs = [];
        function ov(a, b) {
            var o = Math.min(a.outPoint, b.outPoint) - Math.max(a.inPoint, b.inPoint);
            var d = Math.min(a.outPoint - a.inPoint, b.outPoint - b.inPoint);
            return d > 0 ? o / d : 0;
        }
        for (var j = 0; j < ls.length; j++) {
            if (used[ls[j].index]) continue;
            var best = null, bestOv = 0.5;
            for (var k = 0; k < ls.length; k++) {
                if (k === j || used[ls[k].index]) continue;
                var v = ov(ls[j], ls[k]);
                if (v > bestOv) { bestOv = v; best = ls[k]; }
            }
            used[ls[j].index] = true;
            if (best) {
                used[best.index] = true;
                var top = ls[j].index < best.index ? ls[j] : best, bot = top === ls[j] ? best : ls[j];
                pairs.push({ bg: bot.name, subj: top.name });
            } else pairs.push({ bg: ls[j].name, subj: null });
        }
        return pairs;
    }
    function sameV(a, b) {
        if (a === null || b === null || a === undefined || b === undefined) return false;
        if (a.vertices !== undefined) {
            if (!b.vertices || a.vertices.length !== b.vertices.length || a.closed !== b.closed) return false;
            for (var i = 0; i < a.vertices.length; i++) if (Math.abs(a.vertices[i][0] - b.vertices[i][0]) > 1e-3 || Math.abs(a.vertices[i][1] - b.vertices[i][1]) > 1e-3) return false;
            return true;
        }
        if (a instanceof Array) {
            if (a.length !== b.length) return false;
            for (var j = 0; j < a.length; j++) if (Math.abs(a[j] - b[j]) > 1e-5) return false;
            return true;
        }
        return Math.abs(a - b) < 1e-5;
    }
    function lerpOK(a, b, v, f, tol) { // is v close to the straight line a->b at fraction f?
        if (a instanceof Array) { for (var i = 0; i < a.length; i++) if (Math.abs(a[i] + (b[i] - a[i]) * f - v[i]) > tol) return false; return true; }
        return Math.abs(a + (b - a) * f - v) <= tol;
    }
    function reduceSmooth(T, V, tol) { // keep only keys needed so linear keys stay within tol of every frame
        if (T.length < 3) return [T, V];
        var kt = [T[0]], kv = [V[0]], a = 0;
        for (var b = 2; b < T.length; b++) {
            var ok = true;
            for (var m = a + 1; m < b && ok; m++) ok = lerpOK(V[a], V[b], V[m], (T[m] - T[a]) / (T[b] - T[a]), tol);
            if (!ok) { a = b - 1; kt.push(T[a]); kv.push(V[a]); }
        }
        kt.push(T[T.length - 1]); kv.push(V[V.length - 1]);
        return [kt, kv];
    }
    function exprProps(group, out) {
        for (var i = 1; i <= group.numProperties; i++) {
            var p; try { p = group.property(i); } catch (e) { continue; }
            if (!p) continue;
            if (p.propertyType === PropertyType.PROPERTY) {
                try { if (p.canSetExpression && p.expressionEnabled && p.expression !== "") out.push(p); } catch (e2) {}
            } else exprProps(p, out);
        }
    }
    function writeKeys(p, T, V, smooth) {
        var kt = [], kv = [], i;
        var flat = true; for (i = 1; i < V.length && flat; i++) if (!sameV(V[i], V[0])) flat = false;
        if (flat) { kt = [T[0]]; kv = [V[0]]; }
        else if (smooth) { var r = reduceSmooth(T, V, p.matchName === "ADBE Time Remapping" ? 1e-4 : 0.02); kt = r[0]; kv = r[1]; }
        else for (i = 0; i < T.length; i++) if (i === 0 || !sameV(V[i], V[i - 1])) { kt.push(T[i]); kv.push(V[i]); }
        p.expression = "";
        if (kt.length === 1 && p.numKeys === 0) { p.setValue(kv[0]); return 0; }
        p.setValuesAtTimes(kt, kv);
        for (var k = p.numKeys; k >= 1; k--) {
            var t = p.keyTime(k), keep = false;
            for (var j = 0; j < kt.length && !keep; j++) if (Math.abs(kt[j] - t) < 1e-4) keep = true;
            if (!keep) p.removeKey(k);
        }
        var it = smooth ? KeyframeInterpolationType.LINEAR : KeyframeInterpolationType.HOLD;
        for (k = 1; k <= p.numKeys; k++) {
            try { p.setInterpolationTypeAtKey(k, it, it); } catch (e) {}
            if (smooth && p.isSpatial) { try { var z = []; for (var q = 0; q < kv[0].length; q++) z.push(0); p.setSpatialTangentsAtKey(k, z, z); } catch (e2) {} }
        }
        return p.numKeys;
    }
    function isSmooth(layer, p) {
        if (p.matchName === "ADBE Time Remapping") return true;
        var parallaxLayer = hasRole(layer, "bg") || hasRole(layer, "sub") || /:crops$/.test(layer.comment || "");
        return parallaxLayer && (p.matchName === "ADBE Scale" || p.matchName === "ADBE Position");
    }
    function savePre(layer, p, t) {
        if (!(hasRole(layer, "bg") || hasRole(layer, "sub"))) return;
        if (p.numKeys > 0) { if ((layer.comment || "").indexOf("[CS_KEYED]") < 0) layer.comment += " [CS_KEYED]"; return; }
        var v = p.valueAtTime(t, true), s = (v instanceof Array) ? v.join(",") : String(v);
        layer.comment = (layer.comment || "").replace(new RegExp("\\s*\\[CS_PRE:" + p.matchName + "=[^\\]]*\\]", "g"), "") + " [CS_PRE:" + p.matchName + "=" + s + "]";
    }
    function restorePre(layer, notes) {
        var c = layer.comment || "", re = /\[CS_PRE:([^=\]]+)=([^\]]*)\]/g, m, tg = layer.property("ADBE Transform Group");
        while ((m = re.exec(c)) !== null) {
            try {
                var p = tg.property(m[1]); if (!p) continue;
                while (p.numKeys) p.removeKey(1);
                var parts = m[2].split(","), v = [];
                for (var i = 0; i < parts.length; i++) v.push(parseFloat(parts[i]));
                p.setValue(v.length === 1 ? v[0] : v);
            } catch (e) {}
        }
        if (c.indexOf("[CS_KEYED]") >= 0) notes.push(layer.name + ": had its own keyframes before baking, those were replaced by the baked ones.");
        layer.comment = c.replace(/\s*\[CS_PRE:[^\]]*\]/g, "").replace(/\s*\[CS_KEYED\]/g, "");
    }
    function frameTimes(t0, t1, fd) {
        var a = Math.round(t0 / fd) * fd, out = [];
        for (var t = a; t < t1 - 1e-6; t += fd) out.push(t);
        if (!out.length) out.push(a);
        return out;
    }
    function bakeLayer(layer, times, st) {
        var props = [];
        try { layer.locked = false; } catch (e0) {}
        exprProps(layer, props);
        if (!props.length) return;
        var opac = null, rest = [], i, j;
        for (i = 0; i < props.length; i++) {
            var pp = props[i];
            if (!opac && pp.matchName === "ADBE Opacity" && pp.parentProperty.matchName === "ADBE Transform Group") opac = pp; else rest.push(pp);
        }
        var vis = times;
        if (opac) { // only sample the other properties on frames where this box is actually visible
            var ov = [], vt = [];
            for (i = 0; i < times.length; i++) { var v = opac.valueAtTime(times[i], false); ov.push(v); if (v > 0) vt.push(times[i]); }
            vis = vt.length ? vt : [times[0]];
            writeKeys(opac, times, ov, false);
            st.props++;
        }
        for (j = 0; j < rest.length; j++) {
            var p = rest[j], smooth = isSmooth(layer, p), T = smooth ? times : vis, V = [];
            if (smooth) savePre(layer, p, times[0]);
            for (i = 0; i < T.length; i++) V.push(p.valueAtTime(T[i], false));
            writeKeys(p, T, V, smooth);
            st.props++;
        }
    }
    function bakeComps(list, t0, t1, st, tick) {
        for (var c = 0; c < list.length; c++) {
            var comp = list[c], times = frameTimes(t0, t1, comp.frameDuration);
            for (var i = 1; i <= comp.numLayers; i++) { bakeLayer(comp.layer(i), times, st); st.layers++; if (tick) tick(st); }
        }
    }
    function findAmp(comp) {
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (l.name === "Audio Amplitude" && getFx(l, "Both Channels")) return l;
        }
        return null;
    }
    function clearBeatMarkers(comp) {
        var mp = comp.markerProperty, n = 0;
        for (var k = mp.numKeys; k >= 1; k--) if (mp.keyValue(k).comment === "CS beat") { mp.removeKey(k); n++; }
        return n;
    }
    function num(et, def) { var v = parseFloat(et.text); return isNaN(v) ? def : v; }
    function writeText(file, txt) { file.encoding = "UTF-8"; if (!file.open("w")) return false; file.write(txt); file.close(); return true; }

    // ---------------- layer kinds ----------------
    function isPlayer(l) { return (l instanceof AVLayer) && (l.source instanceof CompItem) && getFx(l, P + "BPM") != null && /\[CS:[a-z0-9]+\]/.test(l.comment || ""); }
    function isTR(l) { return (l instanceof AVLayer) && (l.source instanceof CompItem) && /\[CSTR:[a-z0-9]+\]/.test(l.comment || ""); } // v5 transition layers (only for cleanup)
    function isPlainAV(l) { return (l instanceof AVLayer) && !isGen(l) && !isPlayer(l) && !isTR(l); }
    function selectedPlayers(comp) {
        var s = comp.selectedLayers, out = [];
        for (var i = 0; i < s.length; i++) if (isPlayer(s[i])) out.push(s[i]);
        return out;
    }
    function findPlayerByUid(main, uid) {
        for (var i = 1; i <= main.numLayers; i++) if (uidOf(main.layer(i)) === uid && isPlayer(main.layer(i))) return main.layer(i);
        return null;
    }

    // ---------------- controls ----------------
    function addControls(layer) {
        for (var i = 0; i < CONTROLS.length; i++) {
            var name = P + CONTROLS[i][0], type = CONTROLS[i][1], val = CONTROLS[i][2];
            if (getFx(layer, name)) continue;
            var added = fxp(layer).addProperty(MN[type]);
            added.name = name;
            if (!getFx(layer, name)) throw new Error("After Effects renamed control '" + name + "' to '" + added.name + "' on " + layer.name + ". Please report this message.");
            if (type === "sep") continue;
            if (val === "rand") val = 1 + Math.floor(Math.random() * 999);
            if (val === "center") val = [layer.width / 2, layer.height / 2];
            getFx(layer, name).property(1).setValue(val);
        }
    }
    function pruneControls(layer) { // drop CS controls from older versions (outline, mixed media, ...)
        var keep = {}; for (var i = 0; i < CONTROLS.length; i++) keep[P + CONTROLS[i][0]] = true;
        var fx = fxp(layer);
        for (var j = fx.numProperties; j >= 1; j--) { var n = fx.property(j).name; if (n.indexOf(P) === 0 && !keep[n]) fx.property(j).remove(); }
    }

    // ---------------- project folders ----------------
    //   Crop Scatter / Players / <player> / (player comp)  Boxes/  Inputs/
    //   Crop Scatter / Backups
    function csPath(parts) {
        var f = childFolder(app.project.rootFolder, "Crop Scatter");
        for (var i = 0; i < parts.length; i++) f = childFolder(f, parts[i]);
        return f;
    }
    function shortPlayerName(n) { return n.replace(/^CS Player - /, "").replace(/ \[backup\]$/, ""); }
    function itemPath(it, names) {
        if (!(it instanceof CompItem)) return null;
        var c = it.comment || "", n = it.name, m;
        if (/^CS_BACKUP:|^CS_BKSUB\|/.test(c)) return ["Backups"];
        if ((m = /^CS_PLCOMP:([a-z0-9]+)/.exec(c))) return ["Players", shortPlayerName(n)];
        if ((m = /^CS_CROPS:([a-z0-9]+)/.exec(c))) return ["Players", names[m[1]] || "(no player)", "Boxes"];
        if ((m = /^CS_IN:([a-z0-9]+):/.exec(c))) return ["Players", names[m[1]] || "(no player)", "Inputs"];
        if (/ \| CS Crops /.test(n)) return ["Players", shortPlayerName(n.split(" | CS Crops ")[0]), "Boxes"];
        if (/^CS Player - /.test(n)) return ["Players", shortPlayerName(n)];
        return null;
    }
    function removeEmpty(f) {
        for (var i = f.numItems; i >= 1; i--) { var s = f.item(i); if (s instanceof FolderItem) removeEmpty(s); }
        for (var j = f.numItems; j >= 1; j--) { var t = f.item(j); if (t instanceof FolderItem && t.numItems === 0) t.remove(); }
    }
    function tidyProject() {
        var names = {}, list = [], i, it;
        for (i = 1; i <= app.project.numItems; i++) {
            it = app.project.item(i);
            var m = (it instanceof CompItem) ? /^CS_PLCOMP:([a-z0-9]+)/.exec(it.comment || "") : null;
            if (m) names[m[1]] = shortPlayerName(it.name);
        }
        for (i = 1; i <= app.project.numItems; i++) { it = app.project.item(i); var p = itemPath(it, names); if (p) list.push([it, p]); }
        for (i = 0; i < list.length; i++) {
            try { var f = csPath(list[i][1]); if (list[i][0].parentFolder.id !== f.id) list[i][0].parentFolder = f; } catch (e) {}
        }
        var root = app.project.rootFolder, legacy = { "Crop Scatter Precomps": 1, "Crop Scatter Transitions": 1 };
        for (i = root.numItems; i >= 1; i--) {
            var r = root.item(i);
            if (r instanceof FolderItem && (legacy[r.name] || r.name === "Crop Scatter")) { removeEmpty(r); if (r.numItems === 0) r.remove(); }
        }
    }

    // ---------------- input comps ----------------
    function canNormalize(L) { // can this layer live in a comp at its own size, with its placement moved outside?
        try {
            if (!(L instanceof AVLayer) || !L.source || !(L.source.width > 0)) return false;
            if (L.threeDLayer || L.parent || Math.abs(L.stretch - 100) > 1e-6) return false;  // speed ramps (time remap) are fine
            var tg = L.property("ADBE Transform Group"), ks = ["ADBE Anchor Point", "ADBE Position", "ADBE Scale", "ADBE Rotate Z"];
            for (var k = 0; k < ks.length; k++) {
                var p = tg.property(ks[k]);
                if (p.numKeys > 0 || (p.expressionEnabled && p.expression !== "")) return false;
            }
            return !tg.property("ADBE Position").dimensionsSeparated;
        } catch (e) { return false; }
    }
    function vec(like, x, y) { var o = [x, y]; if (like.length > 2) o.push(like[2]); return o; }
    function isIdentityOuter(O, ic) { // the outer layer still just shows the input 1:1 (fresh precompose / v6.0 fallback)
        try {
            var tg = O.property("ADBE Transform Group"), a = tg.property("ADBE Anchor Point").value, p = tg.property("ADBE Position").value, s = tg.property("ADBE Scale").value;
            return Math.abs(O.startTime) < 1e-6 && Math.abs(a[0] - ic.width / 2) < 0.01 && Math.abs(a[1] - ic.height / 2) < 0.01 &&
                   Math.abs(p[0] - a[0]) < 0.01 && Math.abs(p[1] - a[1]) < 0.01 && Math.abs(s[0] - 100) < 1e-4 && Math.abs(s[1] - 100) < 1e-4 &&
                   Math.abs(tg.property("ADBE Rotate Z").value) < 1e-6;
        } catch (e) { return false; }
    }
    // move the clip's placement + start time out to the outer layer, so the input comp holds the clip at its own size
    function normalizeInput(ic, I, O, role) {
        var src = I.source, st = I.startTime, inP = I.inPoint, outP = I.outPoint, w = src.width, h = src.height;
        var tg = I.property("ADBE Transform Group");
        var a = tg.property("ADBE Anchor Point").value, p = tg.property("ADBE Position").value;
        var s = tg.property("ADBE Scale").value, r = tg.property("ADBE Rotate Z").value;
        I.startTime = 0;                                   // speed-ramp keys move with the layer
        ic.width = w; ic.height = h; ic.pixelAspect = src.pixelAspect;
        if (src.duration > 0) ic.duration = Math.max(src.duration, outP - st);
        try { if (src.frameRate > 0) ic.frameRate = src.frameRate; } catch (e1) {}
        tg.property("ADBE Anchor Point").setValue(vec(a, w / 2, h / 2));
        tg.property("ADBE Position").setValue(vec(p, w / 2, h / 2));
        tg.property("ADBE Scale").setValue(vec(s, 100, 100));
        tg.property("ADBE Rotate Z").setValue(0);
        var otg = O.property("ADBE Transform Group");
        otg.property("ADBE Anchor Point").setValue(a);
        otg.property("ADBE Position").setValue(p);
        otg.property("ADBE Scale").setValue(s);
        otg.property("ADBE Rotate Z").setValue(r);
        O.startTime = st;
        try { O.inPoint = inP; O.outPoint = outP; } catch (e3) {}
        I.comment = (I.comment || "").replace(/\s*\[CS_NORM\]/g, "") + " [CS_NORM]";
    }
    // Full only: room to retime. Time Remap is switched on (ready for speed ramps) and the comp gets 2x headroom for slow-mo.
    function prepTiming(ic, I, O, pc) {
        var src = I.source;
        if (!src || !(src.duration > 0)) return;
        try {
            if (!I.timeRemapEnabled && I.canSetTimeRemapEnabled) {
                try { I.inPoint = 0; I.outPoint = src.duration; } catch (e0) {}
                I.timeRemapEnabled = true;                 // identity: nothing changes until you ramp it
            }
        } catch (e) {}
        var want = Math.ceil(Math.max(src.duration, I.outPoint) * 2);
        if (ic.duration < want) ic.duration = want;
        try { I.inPoint = 0; I.outPoint = ic.duration; } catch (e1) {}
        try { O.inPoint = Math.max(O.startTime, 0); O.outPoint = Math.min(pc.duration, O.startTime + ic.duration); } catch (e2) {}
    }
    function makeInput(comp, L, uid, role, name, notes) {
        var ok = canNormalize(L), oname = L.name;
        var ic = comp.layers.precompose([L.index], name, true);
        ic.comment = "CS_IN:" + uid + ":" + role;
        var O = null;
        for (var i = 1; i <= comp.numLayers; i++) { try { if (comp.layer(i).source && comp.layer(i).source.id === ic.id) { O = comp.layer(i); break; } } catch (e) {} }
        var I = ic.layer(1);
        I.comment = (I.comment || "").replace(/\s*\[CS_ROLE:\w+\]/g, "").replace(/\s*\[CS_PRE:[^\]]*\]/g, "").replace(/\s*\[CS_KEYED\]/g, "");
        if (ok) normalizeInput(ic, I, O, role);
        else notes.push(oname + ": its input comp is comp-sized (the layer has keyframed position/scale, time stretch, parenting or 3D).");
        if (role === "full") prepTiming(ic, I, O, comp);
        O.name = oname;
        setRole(O, role === "roto" ? "sub" : "bg");
        try { O.audioEnabled = false; } catch (e4) {}
        return O;
    }
    // bring v6.0 inputs up to date (they may be comp-sized, or missing the retime headroom)
    function upgradeInput(O, role, pc, notes) {
        var ic = O.source, I = ic.layer(1);
        if (!I || (I.comment || "").indexOf("[CS_NORM]") >= 0) { if (role === "full" && I) prepTiming(ic, I, O, pc); return; }
        if (isIdentityOuter(O, ic) && canNormalize(I)) normalizeInput(ic, I, O, role);
        else I.comment = (I.comment || "") + " [CS_NORM]";  // already clip-sized from v6.0, or can't be moved: leave placement
        if (role === "full") prepTiming(ic, I, O, pc);
    }
    function isInput(l, uid, role) { try { return (l.source instanceof CompItem) && (l.source.comment || "") === "CS_IN:" + uid + ":" + role; } catch (e) { return false; } }
    function playerParts(PL) {
        var pc = PL.source, o = { bg: null, subj: null };
        for (var i = 1; i <= pc.numLayers; i++) {
            if (hasRole(pc.layer(i), "bg")) o.bg = pc.layer(i);
            if (hasRole(pc.layer(i), "sub")) o.subj = pc.layer(i);
        }
        return o;
    }
    // make sure a player has Full / Roto / Crop Source inputs (upgrades v4/v5 players in place)
    function ensureInputs(PL, notes) {
        var pc = PL.source, uid = uidOf(PL), pp = playerParts(PL), base = shortPlayerName(PL.name);
        if (!pp.bg) return null;
        if (!isInput(pp.bg, uid, "full")) { restorePre(pp.bg, notes); clearParallax(pp.bg); pp.bg = makeInput(pc, pp.bg, uid, "full", base + " - Full", notes); }
        else upgradeInput(pp.bg, "full", pc, notes);
        if (pp.subj && !isInput(pp.subj, uid, "roto")) { restorePre(pp.subj, notes); clearParallax(pp.subj); pp.subj = makeInput(pc, pp.subj, uid, "roto", base + " - Roto", notes); }
        else if (pp.subj) upgradeInput(pp.subj, "roto", pc, notes);
        var full = pp.bg.source, crop = findItem("CS_IN:" + uid + ":crop");
        if (!crop) {
            crop = app.project.items.addComp(base + " - Crop Source", full.width, full.height, full.pixelAspect, full.duration, full.frameRate);
            crop.comment = "CS_IN:" + uid + ":crop";
            var cl = crop.layers.add(full); cl.startTime = 0;
            try { cl.audioEnabled = false; } catch (e) {}
        } else if (crop.duration < full.duration) crop.duration = full.duration;
        if (pp.subj) refreshRotoFollow(pp);
        pp.crop = crop;
        return pp;
    }
    // Roto follows Full's timing: the roto clip's Time Remap reads the Full clip's, so you only retime once
    function rotoFollowExpr(fullComp, fullLayer) {
        return 'try{comp("' + esc(fullComp.name) + '").layer("' + esc(fullLayer.name) + '").timeRemap;}catch(e){value;}';
    }
    function refreshRotoFollow(pp) {
        try {
            var R = pp.subj.source.layer(1), F = pp.bg.source.layer(1);
            if ((R.comment || "").indexOf("[CS_FOLLOW]") < 0) return;
            if (!R.timeRemapEnabled) R.timeRemapEnabled = true;
            setExpr(R.property("ADBE Time Remapping"), rotoFollowExpr(pp.bg.source, F));
            if (pp.subj.source.duration < pp.bg.source.duration) pp.subj.source.duration = pp.bg.source.duration;
            try { R.outPoint = Math.max(R.outPoint, Math.min(pp.subj.source.duration, F.outPoint)); } catch (e) {}
            try { pp.subj.outPoint = Math.max(pp.subj.outPoint, pp.bg.outPoint); } catch (e2) {}
        } catch (e3) {}
    }
    function setRotoFollow(PL, on) {
        var pp = playerParts(PL);
        if (!pp.subj || !isInput(pp.subj, uidOf(PL), "roto") || !isInput(pp.bg, uidOf(PL), "full")) return "needs Rebuild Selected first";
        var R = pp.subj.source.layer(1), F = pp.bg.source.layer(1);
        if (on) {
            if (R.source !== F.source && R.source.id !== F.source.id) return "the roto isn't the same clip as the background";
            R.comment = (R.comment || "").replace(/\s*\[CS_FOLLOW\]/g, "") + " [CS_FOLLOW]";
            refreshRotoFollow(pp);
        } else {
            R.comment = (R.comment || "").replace(/\s*\[CS_FOLLOW\]/g, "");
            try { R.property("ADBE Time Remapping").expression = ""; } catch (e) {}
        }
        return "";
    }
    // put a different clip in a player's Crop Source, scaled to fill it
    function setCropSource(PL, item) {
        var crop = findItem("CS_IN:" + uidOf(PL) + ":crop");
        if (!crop) return false;
        for (var i = crop.numLayers; i >= 1; i--) { crop.layer(i).locked = false; crop.layer(i).remove(); }
        var l = crop.layers.add(item);
        l.startTime = 0;
        try { l.audioEnabled = false; } catch (e) {}
        var sc = Math.max(crop.width / l.width, crop.height / l.height) * 100;
        var tg = l.property("ADBE Transform Group");
        tg.property("ADBE Scale").setValue([sc, sc]);
        tg.property("ADBE Position").setValue([crop.width / 2, crop.height / 2]);
        return true;
    }

    // ---------------- effects on box layers ----------------
    function addLookFx(layer) {
        var list = [["ADBE Geometry2", "Transform"], ["ADBE Invert", "Invert"], ["ADBE Tint", "Mono"],
                    ["ADBE Tint", "Tint"], ["ADBE Brightness & Contrast 2", "BC"], ["ADBE Glo2", "Glow"]];
        for (var i = 0; i < list.length; i++) { try { fxp(layer).addProperty(list[i][0]).name = P + list[i][1]; } catch (e) {} }
        try { findProp(getFx(layer, P + "Transform"), ["Uniform Scale", "ADBE Geometry2-0011"], 3).setValue(0); } catch (e1) {}
    }
    function setLookExprs(layer, R) { // R = mini header + READ (reads the box data, never recomputes it)
        var inv = getFx(layer, P + "Invert"), mono = getFx(layer, P + "Mono"), tint = getFx(layer, P + "Tint");
        var bc = getFx(layer, P + "BC"), glow = getFx(layer, P + "Glow");
        setExpr(findProp(inv, ["Blend With Original", "ADBE Invert-0002"], 2), R + TAIL.invert);
        setExpr(findProp(mono, ["Amount to Tint", "ADBE Tint-0003"], 3), R + TAIL.monoAmt);
        setExpr(findProp(tint, ["Amount to Tint", "ADBE Tint-0003"], 3), R + TAIL.tintAmt);
        setExpr(findProp(tint, ["Map Black To", "ADBE Tint-0001"], 1), R + TAIL.tintDark);
        setExpr(findProp(tint, ["Map White To", "ADBE Tint-0002"], 2), R + TAIL.tintLight);
        setExpr(findProp(bc, ["Brightness", "ADBE Brightness & Contrast 2-0001"], 1), R + TAIL.bright);
        setExpr(findProp(bc, ["Contrast", "ADBE Brightness & Contrast 2-0002"], 2), R + TAIL.contrast);
        setExpr(findProp(glow, ["Glow Threshold", "ADBE Glo2-0002"], 2), R + 'g("Glow Threshold %");');
        setExpr(findProp(glow, ["Glow Radius", "ADBE Glo2-0003"], 3), R + 'g("Glow Radius");');
        setExpr(findProp(glow, ["Glow Intensity", "ADBE Glo2-0004"], 4), R + TAIL.glowInt);
        setExpr(layer.property("ADBE Transform Group").property("ADBE Opacity"), R + TAIL.opacity);
    }
    function setupBox(d, H, mini) {
        var masks = d.property("ADBE Mask Parade");
        for (var m = masks.numProperties; m >= 1; m--) masks.property(m).remove();
        var mk = masks.addProperty("ADBE Mask Atom");
        mk.maskMode = MaskMode.ADD;
        var shp = new Shape();
        shp.vertices = [[0, 0], [10, 0], [10, 10], [0, 10]];
        shp.closed = true;
        mk.property("ADBE Mask Shape").setValue(shp);
        var keys = ["D1", "D2", "D3"];
        for (var k = 0; k < 3; k++) {         // the only 3 places the full box maths runs
            var e = fxp(d).addProperty("ADBE Point3D Control"); e.name = P + keys[k];
            setExpr(getFx(d, P + keys[k]).property(1), H + DATA[keys[k]]);
        }
        addLookFx(d);
        var R = mini + READ;
        setExpr(mk.property("ADBE Mask Shape"), R + TAIL.mask);
        var tp = trProps(getFx(d, P + "Transform"));
        setExpr(tp.anchor, R + TAIL.bAnchor);
        setExpr(tp.pos, R + TAIL.bPos);
        setExpr(tp.sh, R + TAIL.bSH);
        setExpr(tp.sw, R + TAIL.bSW);
        setExpr(tp.rot, R + TAIL.bRot);
        setLookExprs(d, R);
    }
    function prepBox(d, uid, tag, label) {
        d.comment = "CS_GEN:" + uid + ":" + tag;
        stripCS(d);
        try { if (d.hasAudio) d.audioEnabled = false; } catch (e) {}
        try { d.motionBlur = false; } catch (e2) {}
        try { d.parent = null; } catch (e3) {}
        var tg = d.property("ADBE Transform Group");
        try { tg.property("ADBE Scale").expression = ""; tg.property("ADBE Position").expression = ""; } catch (e4) {}
        d.enabled = true;
        d.label = label;
    }

    // ---------------- transition links ----------------
    function linkOf(PL, which) { var m = new RegExp("\\[CS_" + which.toUpperCase() + ":([a-z0-9]+)\\]").exec(PL.comment || ""); return m ? m[1] : null; }
    function setLink(PL, which, uid) {
        var tag = "CS_" + which.toUpperCase();
        var c = (PL.comment || "").replace(new RegExp("\\s*\\[" + tag + ":[a-z0-9]+\\]", "g"), "");
        PL.comment = uid ? c + " [" + tag + ":" + uid + "]" : c;
    }
    // sorted by start time; neighbours less than 1 s apart get linked
    function playerChain(list) {
        var ls = list.slice(0);
        ls.sort(function (a, b) { return a.inPoint - b.inPoint; });
        var pairs = [];
        for (var i = 0; i + 1 < ls.length; i++) if (ls[i + 1].inPoint - ls[i].outPoint <= 1) pairs.push([ls[i], ls[i + 1]]);
        return pairs;
    }

    // ---------------- crops comps ----------------
    function twinRemapExpr(mainName, plName, otherName, off) {
        return 'var MC=comp("' + esc(mainName) + '");\n' +
               'var t=time+MC.layer("' + esc(plName) + '").startTime-MC.layer("' + esc(otherName) + '").startTime-' + off + ';\n' +
               'Math.min(Math.max(t,0),Math.max(0,thisLayer.source.duration-thisComp.frameDuration));';
    }
    // player-comp time for a main-comp time (handles a speed-ramped / stretched player layer)
    function plTime(PL, t) {
        try { if (PL.timeRemapEnabled) return PL.property("ADBE Time Remapping").valueAtTime(t, false); } catch (e) {}
        var sf = Math.abs(PL.stretch) > 1e-6 ? 100 / PL.stretch : 1;
        return (t - PL.startTime) * sf;
    }
    function playerWindow(PL) { var a = plTime(PL, PL.inPoint), b = plTime(PL, PL.outPoint); return [Math.min(a, b), Math.max(a, b)]; }
    // only exists around its cut: lead length + a little margin
    function twinWindow(PL, role, cdur) {
        var w = playerWindow(PL), lead = Math.max(getCtl(PL, role === "prev" ? "Lead In s" : "Lead Out s") || 0.5, 0.05) + 0.25;
        var a = role === "prev" ? w[0] : w[1] - lead, b = role === "prev" ? w[0] + lead : w[1];
        return [Math.max(0, a), Math.min(cdur, b)];
    }
    function trimTwins(PL) { // after Lead In / Lead Out changes
        var cs = subComps(PL.source);
        for (var c = 0; c < cs.length; c++) for (var i = 1; i <= cs[c].numLayers; i++) {
            var l = cs[c].layer(i), m = /^CS_GEN:[a-z0-9]+:(prev|next)$/.exec(l.comment || "");
            if (!m) continue;
            var win = twinWindow(PL, m[1], cs[c].duration);
            try { l.inPoint = 0; l.outPoint = win[1]; l.inPoint = win[0]; } catch (e) {}
        }
    }
    function makeCrops(main, PL, pp, uid, side, opts, links) {
        var pc = PL.source, mainName = main.name, plName = PL.name;
        var label = side === "front" ? "Front" : (side === "back" ? "Behind" : "All");
        var c = app.project.items.addComp(plName + " | CS Crops " + label, pc.width, pc.height, pc.pixelAspect, pc.duration, pc.frameRate);
        c.comment = "CS_CROPS:" + uid;
        var mini = miniHeader(mainName, plName), i, d;
        for (i = 0; i < opts.pool; i++) {
            d = copyInto(pp.bg, c);
            prepBox(d, uid, "box", 9);
            d.name = "CS Box " + pad(i + 1);
            d.replaceSource(pp.crop, false);
            setupBox(d, exprHeader(mainName, plName, i, side, "main") + BOX_FN, mini);
        }
        for (var k = 0; k < links.length; k++) {
            var lk = links[k], win = twinWindow(PL, lk.role, c.duration);
            for (i = 0; i < opts.trPool; i++) {
                d = copyInto(lk.bg, c);
                prepBox(d, uid, lk.role, lk.role === "prev" ? 14 : 11);
                d.name = "CS " + (lk.role === "prev" ? "Prev" : "Next") + " " + pad(i + 1);
                d.replaceSource(lk.crop, false);
                d.timeRemapEnabled = true;
                setExpr(d.property("ADBE Time Remapping"), twinRemapExpr(mainName, plName, lk.PL.name, lk.bg.startTime));
                d.startTime = 0;
                try { d.inPoint = 0; d.outPoint = win[1]; d.inPoint = win[0]; } catch (e) {}
                setupBox(d, exprHeader(mainName, plName, i, side, lk.role) + BOX_FN, mini);
            }
        }
        return c;
    }
    function removeCrops(pc) {
        var comps = [];
        for (var i = pc.numLayers; i >= 1; i--) {
            var l = pc.layer(i);
            if (/^CS_GEN:/.test(l.comment || "")) {
                try { if (l.source instanceof CompItem) comps.push(l.source); } catch (e) {}
                l.locked = false;
                l.remove();
            }
        }
        for (var k = 0; k < comps.length; k++) { try { if (comps[k].usedIn.length === 0) comps[k].remove(); } catch (e2) {} }
    }

    // build/refresh everything inside a player. ctx.done stops a player being rebuilt twice in one click.
    function fillPlayer(main, PL, opts, notes, ctx) {
        ctx = ctx || { done: {} };
        var uid = uidOf(PL);
        if (ctx.done[uid]) return;
        ctx.done[uid] = true;
        var wasOn = PL.enabled;
        try { PL.enabled = false; fillPlayerInner(main, PL, opts, notes, ctx, uid); }
        finally { try { PL.enabled = wasOn; } catch (e0) {} }
    }
    function fillPlayerInner(main, PL, opts, notes, ctx, uid) {
        var pc = PL.source, pp0 = playerParts(PL);
        if (!pp0.bg) { notes.push(PL.name + ": couldn't find its background layer inside, skipped."); return; }
        var cs = [pp0.bg, pp0.subj];
        for (var q = 0; q < 2; q++) if (cs[q]) { restorePre(cs[q], notes); stripCS(cs[q]); cs[q].comment = (cs[q].comment || "").replace(/\s*\[CS(?:SUB)?:[a-z0-9]+\]/g, ""); clearParallax(cs[q]); }
        removeCrops(pc);
        pruneControls(PL);
        addControls(PL);
        if (isBaked(PL)) deleteBackup(uid);
        setBaked(PL, false);
        pc.comment = "CS_PLCOMP:" + uid;
        var pp = ensureInputs(PL, notes);
        centerAnchor(pp.bg, notes);
        if (pp.subj) centerAnchor(pp.subj, notes);

        // neighbouring clips this player transitions with
        var links = [], roles = ["prev", "next"];
        for (var r = 0; r < 2; r++) {
            var ou = linkOf(PL, roles[r]), O = ou ? findPlayerByUid(main, ou) : null;
            if (ou && !O) { setLink(PL, roles[r], null); notes.push(PL.name + ": its linked " + roles[r] + " clip is gone, link removed."); }
            if (!O) continue;
            var op = playerParts(O), oc = findItem("CS_IN:" + ou + ":crop");
            if (!oc || !op.bg || !isInput(op.bg, ou, "full")) { fillPlayer(main, O, opts, notes, ctx); op = playerParts(O); oc = findItem("CS_IN:" + ou + ":crop"); }
            if (oc && op.bg) links.push({ role: roles[r], PL: O, bg: op.bg, crop: oc });
        }
        var hasPrev = false, hasNext = false;
        for (var h = 0; h < links.length; h++) { if (links[h].role === "prev") hasPrev = true; else hasNext = true; }
        setCtl(PL, "Trans From Prev", hasPrev ? 1 : 0);
        setCtl(PL, "Trans To Next", hasNext ? 1 : 0);

        var mainName = main.name, plName = PL.name;
        var sides = pp.subj ? ["back", "front"] : ["all"], L = {};
        for (var s = 0; s < sides.length; s++) {
            var c = makeCrops(main, PL, pp, uid, sides[s], opts, links);
            var cl = pc.layers.add(c);
            cl.startTime = 0;
            cl.comment = "CS_GEN:" + uid + ":crops";
            cl.label = sides[s] === "front" ? 11 : 10;
            var tg = cl.property("ADBE Transform Group");
            tg.property("ADBE Anchor Point").setValue([pc.width / 2, pc.height / 2]);
            tg.property("ADBE Position").setValue([pc.width / 2, pc.height / 2]);
            L[sides[s]] = cl;
        }
        if (pp.subj) {
            L.back.moveBefore(pp.bg);
            if (pp.subj.index > L.back.index) pp.subj.moveBefore(L.back);
            L.front.moveBefore(pp.subj);
            setParallax(pp.bg, mainName, plName, "Depth Background");
            setParallax(L.back, mainName, plName, "Depth Behind");
            setParallax(pp.subj, mainName, plName, "Depth Subject");
            setParallax(L.front, mainName, plName, "Depth Front");
        } else {
            L.all.moveBefore(pp.bg);
            setParallax(pp.bg, mainName, plName, "Depth Background");
            setParallax(L.all, mainName, plName, "Depth Front");
        }
    }

    function buildPlayer(main, bg, subj, opts, notes, ctx) {
        if (subj && subj.index === bg.index) subj = null;
        legacyClean(main, bg);
        if (subj) legacyClean(main, subj);
        if (dupCompNames(main.name) > 1) notes.push("WARNING: more than one comp is named '" + main.name + "'. Expressions find the main comp by name, so rename the other one.");
        setRole(bg, "bg");
        if (subj) setRole(subj, "sub");
        var inP = bg.inPoint, outP = bg.outPoint;
        if (subj) { inP = Math.min(inP, subj.inPoint); outP = Math.max(outP, subj.outPoint); }
        var idx = [bg.index]; if (subj) idx.push(subj.index);
        idx.sort(function (a, b) { return a - b; });
        var baseName = "CS Player - " + bg.name;
        var pc = main.layers.precompose(idx, baseName, true);
        var PL = null;
        for (var i = 1; i <= main.numLayers; i++) {
            try { if (main.layer(i).source && main.layer(i).source.id === pc.id) { PL = main.layer(i); break; } } catch (e) {}
        }
        if (!PL) { notes.push("Couldn't find the new player layer for " + bg.name); return null; }
        PL.name = uniqueLayerName(main, baseName, PL.index);
        PL.comment = "[CS:" + makeId() + "]";
        PL.inPoint = inP;
        PL.outPoint = outP;
        fillPlayer(main, PL, opts, notes, ctx);
        return PL;
    }

    // link players in time order (A -> B -> C ...) and rebuild everything involved
    function linkPlayers(main, list, opts, notes) {
        var pairs = playerChain(list), touched = [], seen = {}, i;
        for (i = 0; i < pairs.length; i++) {
            setLink(pairs[i][0], "next", uidOf(pairs[i][1]));
            setLink(pairs[i][1], "prev", uidOf(pairs[i][0]));
            for (var k = 0; k < 2; k++) { var u = uidOf(pairs[i][k]); if (!seen[u]) { seen[u] = 1; touched.push(pairs[i][k]); } }
        }
        return { pairs: pairs.length, touched: touched };  // caller rebuilds them one at a time
    }
    function unlinkPlayers(main, list, opts, notes) {
        var touched = [], seen = {}, i;
        function touch(L) { var u = uidOf(L); if (L && !seen[u]) { seen[u] = 1; touched.push(L); } }
        for (i = 0; i < list.length; i++) {
            var roles = ["prev", "next"];
            for (var r = 0; r < 2; r++) {
                var ou = linkOf(list[i], roles[r]); if (!ou) continue;
                var O = findPlayerByUid(main, ou);
                if (O) { setLink(O, roles[r] === "prev" ? "next" : "prev", null); touch(O); }
                setLink(list[i], roles[r], null);
            }
            touch(list[i]);
        }
        return touched;
    }

    // ---------------- cleanup / repair ----------------
    function purgeOrphanComps() {
        var n = 0;
        for (var i = app.project.numItems; i >= 1; i--) {
            var it = app.project.item(i);
            if (it instanceof CompItem && (/^CS_CROPS:/.test(it.comment || "") || / \| CS Crops /.test(it.name)) && !/^CS_BKSUB\|/.test(it.comment || "") && it.usedIn.length === 0) { it.remove(); n++; }
        }
        return n;
    }
    // v5 "CS Trans" layers: delete them and their comps, link the two players instead
    function removeLegacyTR(main, notes) {
        var n = 0, links = 0;
        for (var i = main.numLayers; i >= 1; i--) {
            var T = main.layer(i);
            if (!isTR(T)) continue;
            var uid = uidTR(T), side = {}, sides = ["A", "B"];
            for (var s = 0; s < 2; s++) {
                var X = findItem("CS_TRSRCX:" + uid + ":" + sides[s]), nm = X ? /\|(.*)$/.exec(X.comment || "") : null;
                side[sides[s]] = nm ? layerByName(main, decodeURIComponent(nm[1])) : null;
            }
            var trc = T.source;
            T.locked = false; T.remove(); n++;
            try { if (trc.usedIn.length === 0) trc.remove(); } catch (e) {}
            var tags = ["CS_TRSRC:" + uid + ":A", "CS_TRSRC:" + uid + ":B", "CS_TRSRCX:" + uid + ":A", "CS_TRSRCX:" + uid + ":B"];
            for (var k = 0; k < tags.length; k++) { var it = findItem(tags[k]); if (it) { try { it.remove(); } catch (e2) {} } }
            deleteBackup(uid);
            if (side.A && side.B && isPlayer(side.A) && isPlayer(side.B)) {
                setCtl(side.A, "Quiet End s", 0); setCtl(side.B, "Quiet Start s", 0);
                setLink(side.A, "next", uidOf(side.B)); setLink(side.B, "prev", uidOf(side.A)); links++;
            }
        }
        if (n) notes.push("Replaced " + n + " old v5 transition layer(s) with v6 player links (" + links + " linked).");
    }
    function repairComp(main, opts) {
        var removed = 0, stripped = 0, rebuilt = 0, skipped = 0, notes = [];
        for (var i = main.numLayers; i >= 1; i--) {
            var l = main.layer(i);
            if (/^CS_GEN:/.test(l.comment || "")) { l.locked = false; l.remove(); removed++; }
        }
        removeLegacyTR(main, notes);
        for (var j = 1; j <= main.numLayers; j++) {
            var L = main.layer(j);
            if (isPlayer(L) || !(L instanceof AVLayer)) continue;
            var had = /\[CS(?:SUB)?:/.test(L.comment || "");
            var fx = fxp(L);
            for (var k = 1; k <= fx.numProperties; k++) if (fx.property(k).name.indexOf(P) === 0) had = true;
            if (had) { legacyClean(main, L); stripped++; }
        }
        var list = [], todo = [];
        for (var p = 1; p <= main.numLayers; p++) if (isPlayer(main.layer(p))) list.push(main.layer(p));
        for (var q = 0; q < list.length; q++) {
            if (isBaked(list[q])) { skipped++; continue; }
            list[q].name = uniqueLayerName(main, list[q].name, list[q].index);
            todo.push(list[q]);
        }
        notes.unshift("Removed " + removed + " old box layer(s), cleaned " + stripped + " layer(s), rebuilt " +
                      todo.length + " player(s)." + (skipped ? " Left " + skipped + " baked player(s) alone." : ""));
        if (dupCompNames(main.name) > 1) notes.push("WARNING: more than one comp is named '" + main.name + "'. Rename one of them, then hit Repair again.");
        return { notes: notes, todo: todo };   // caller rebuilds them one at a time, then purgeOrphanComps()
    }

    // ---------------- bake backups ----------------
    function subComps(comp) { // crop comps inside a player (live or backup)
        var out = [], seen = {};
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            try {
                if ((l.source instanceof CompItem) && !seen[l.source.id] && (/:crops$/.test(l.comment || "") || /^CS_BKSUB\|/.test(l.source.comment || ""))) {
                    seen[l.source.id] = true; out.push(l.source);
                }
            } catch (e) {}
        }
        return out;
    }
    function deleteBackup(uid) {
        var bk = findItem("CS_BACKUP:" + uid + "|"); if (!bk) return;
        var subs = subComps(bk);
        try { bk.remove(); } catch (e) {}
        for (var i = 0; i < subs.length; i++) { try { if (subs[i].usedIn.length === 0) subs[i].remove(); } catch (e2) {} }
    }
    function makeBackup(L) {
        var uid = uidOf(L), src = L.source;
        deleteBackup(uid);
        var d = src.duplicate(), map = {};
        d.name = src.name + " [backup]";
        d.comment = "CS_BACKUP:" + uid + "|" + (src.comment || "");
        for (var i = 1; i <= d.numLayers; i++) {
            var l = d.layer(i);
            try {
                if (!(l.source instanceof CompItem) || !/:crops$/.test(l.comment || "")) continue;
                var s = l.source;
                if (!map[s.id]) { var sd = s.duplicate(); sd.name = s.name + " [backup]"; sd.comment = "CS_BKSUB|" + (s.comment || ""); map[s.id] = sd; }
                l.replaceSource(map[s.id], false);
            } catch (e) {}
        }
        return d;
    }
    function restoreBackup(L, notes) {
        var uid = uidOf(L), bk = findItem("CS_BACKUP:" + uid + "|");
        if (!bk) { notes.push(L.name + ": no backup found. Use Rebuild Selected instead (gives you the live version, hand edits lost)."); return false; }
        var old = L.source, oldName = old.name, oldComment = old.comment, olds = subComps(old), bsubs = subComps(bk), i;
        L.replaceSource(bk, false);
        try { if (old.usedIn.length === 0) old.remove(); } catch (e) {}
        for (i = 0; i < olds.length; i++) { try { if (olds[i].usedIn.length === 0) olds[i].remove(); } catch (e2) {} }
        bk.name = oldName; bk.comment = oldComment;
        for (i = 0; i < bsubs.length; i++) {
            bsubs[i].comment = (bsubs[i].comment || "").replace(/^CS_BKSUB\|/, "");
            bsubs[i].name = bsubs[i].name.replace(/ \[backup\]$/, "");
        }
        setBaked(L, false);
        return true;
    }
    function bakeItem(L, tick, backup) {
        if (backup) makeBackup(L);
        var st = { layers: 0, props: 0, name: L.name }, list = [L.source].concat(subComps(L.source));
        var w = playerWindow(L);
        bakeComps(list, w[0], w[1], st, tick);
        setBaked(L, true);
        return st;
    }

    // ---------------- beats from music ----------------
    function musicToMarkers(comp, pct, gap) {
        var amp = findAmp(comp);
        if (!amp) {
            var s = comp.selectedLayers;
            if (s.length !== 1 || !s[0].hasAudio) { alert("Select ONLY your music layer, then click again."); return; }
            try { app.executeCommand(app.findMenuCommandId("Convert Audio to Keyframes")); } catch (e) {}
            amp = findAmp(comp);
            if (!amp) { alert("Run Animation > Keyframe Assistant > Convert Audio to Keyframes on the music, then click again."); return; }
        }
        var p = getFx(amp, "Both Channels").property(1);
        if (p.numKeys < 2) { alert("Audio Amplitude layer has no keyframes."); return; }
        var mx = 0, k;
        for (k = 1; k <= p.numKeys; k++) mx = Math.max(mx, p.keyValue(k));
        var thr = mx * pct / 100, prev = 0, last = -1e9, n = 0;
        clearBeatMarkers(comp);
        for (k = 1; k <= p.numKeys; k++) {
            var v = p.keyValue(k), t = p.keyTime(k);
            if (v >= thr && prev < thr && t - last >= gap) { comp.markerProperty.setValueAtTime(t, new MarkerValue("CS beat")); last = t; n++; }
            prev = v;
        }
        amp.enabled = false;
        var sw = 0;
        for (var i = 1; i <= comp.numLayers; i++) if (isPlayer(comp.layer(i))) { setCtl(comp.layer(i), SYNC, 2); sw++; }
        alert(n + " beat markers added.\n" + sw + " player(s) switched to Comp Marker sync.");
    }

    function runEach(label, items, fn, tick) {
        var errs = [];
        for (var i = 0; i < items.length; i++) {
            if (tick) tick(i, items.length);
            app.beginUndoGroup(NAME + ": " + label + " " + (i + 1) + "/" + items.length);
            try { fn(items[i], i); } catch (e) { errs.push(e.toString() + (e.line ? " (line " + e.line + ")" : "")); }
            app.endUndoGroup();
            try { $.gc(); } catch (e2) {}
        }
        app.beginUndoGroup(NAME + ": tidy");
        try { tidyProject(); } catch (e3) {}
        app.endUndoGroup();
        if (errs.length) alert(NAME + " error(s):\n" + errs.join("\n"));
    }
    function run(label, fn) {
        app.beginUndoGroup(NAME + ": " + label);
        try { fn(); } catch (e) { alert(NAME + " error: " + e.toString() + (e.line ? " (line " + e.line + ")" : "")); }
        try { tidyProject(); } catch (e2) {}
        app.endUndoGroup();
    }

    // ---------------- presets: saved inside After Effects' own preferences (no files needed) ----------------
    //   Import / Export read and write .cspreset text files so presets can be shared or added later.
    var PS = "CropScatter6";
    function psGet(k) { try { return app.settings.haveSetting(PS, k) ? app.settings.getSetting(PS, k) : ""; } catch (e) { return ""; } }
    function psSet(k, v) { app.settings.saveSetting(PS, k, v); }
    function longSet(key, str) { // AE settings values are kept short, so long text is split into chunks
        var n = Math.max(1, Math.ceil(str.length / 1000));
        psSet(key + "#n", String(n));
        for (var i = 0; i < n; i++) psSet(key + "#" + i, str.substr(i * 1000, 1000));
    }
    function longGet(key) {
        var n = parseInt(psGet(key + "#n"), 10), s = "";
        if (!n) return "";
        for (var i = 0; i < n; i++) s += psGet(key + "#" + i);
        return s;
    }
    function presetKey(name) { return "p_" + encodeURIComponent(name); }
    function presetNames() { var s = longGet("index"); return s ? s.split("\n") : []; }
    function savePrefs() { try { app.preferences.saveToDisk(); } catch (e) {} }
    function storePreset(name, text) {
        var names = presetNames(), have = false;
        for (var i = 0; i < names.length; i++) if (names[i] === name) have = true;
        if (!have) { names.push(name); names.sort(); }
        longSet(presetKey(name), text);
        longSet("index", names.join("\n"));
        savePrefs();
    }
    function deletePreset(name) {
        var names = presetNames(), out = [];
        for (var i = 0; i < names.length; i++) if (names[i] !== name) out.push(names[i]);
        longSet(presetKey(name), "");
        longSet("index", out.join("\n"));
        savePrefs();
    }
    function parsePresetText(txt, fallbackName) {
        var out = { name: fallbackName || "Preset", vals: {}, n: 0 };
        var lines = String(txt || "").split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var ln = lines[i].replace(/^\s+|\s+$/g, "");
            if (!ln || ln.charAt(0) === "#") continue;
            var c = ln.lastIndexOf(":"); if (c < 1) continue;
            var k = ln.substr(0, c).replace(/\s+$/, ""), v = ln.substr(c + 1).replace(/^\s+/, "");
            if (k === "@name") { out.name = v; continue; }
            if (k.charAt(0) === "@") continue;
            if (LEGACY_KEYS[k]) k = LEGACY_KEYS[k];
            var parts = v.split(","), arr = [], ok = true;
            for (var j = 0; j < parts.length; j++) { var x = parseFloat(parts[j]); if (isNaN(x)) ok = false; arr.push(x); }
            if (!ok) continue;
            out.vals[k] = arr.length === 1 ? arr[0] : arr; out.n++;
        }
        return out;
    }
    function loadPreset(name) { var t = longGet(presetKey(name)); return t ? parsePresetText(t, name) : null; }
    function presetText(L, name) {
        var lines = ["# Crop Scatter preset. Edit values freely; delete lines you don't want it to change.", "@name: " + name], sec = "";
        for (var i = 0; i < CONTROLS.length; i++) {
            var c = CONTROLS[i];
            if (c[1] === "sep") { sec = c[0].replace(/[=]/g, "").replace(/^\s+|\s+$/g, ""); lines.push("", "# " + sec); continue; }
            if (PRESET_SKIP[c[0]]) continue;
            var v = getCtl(L, c[0]); if (v === null) continue;
            lines.push(c[0] + ": " + ((v instanceof Array) ? v.join(",") : String(Math.round(v * 10000) / 10000)));
        }
        return lines.join("\n") + "\n";
    }
    function readTextFile(f) { f.encoding = "UTF-8"; if (!f.open("r")) return null; var t = f.read(); f.close(); return t; }

    // ---------------- settings spec for the panel ----------------
    // t: sl slider, int whole-number slider, cb checkbox, dd dropdown, col color, ptx/pty point X/Y.  cb: on/off key shown before a slider
    var SPEC = {
        "Timing": [
            ["Sync"],
            { k: "Enable", l: "Enabled", t: "cb" },
            { k: SYNC, l: "Sync to", t: "dd", items: ["BPM grid", "Clip markers", "Comp markers", "Random timing", "Spread over clip (random)"], vals: [0, 1, 2, 3, 4],
              tip: "What triggers a new set of boxes. 'Spread over clip' ignores the music and plans random changes across the clip's length." },
            { k: "BPM", l: "BPM", t: "sl", min: 60, max: 200, d: 1 },
            { k: "Beats Per Change", l: "Change every", t: "dd", items: ["1/8 beat", "1/4 beat", "1/2 beat", "1 beat", "2 beats", "4 beats", "8 beats"], vals: [0.125, 0.25, 0.5, 1, 2, 4, 8] },
            { k: "Beat Offset", l: "Beat offset (s)", t: "sl", min: -2, max: 2, d: 3, tip: "Shift the BPM grid. 'Downbeat = Playhead' on the Beats page sets this for you." },
            { k: "Phase Beats", l: "Phase (beats)", t: "sl", min: 0, max: 1, d: 2, tip: "0 = on the beat, 0.5 = off beat." },
            ["Spread over clip"],
            { k: "Avg Gap s", l: "Avg time per change", t: "sl", min: 0.05, max: 3, d: 2, tip: "Used when Sync to = Spread over clip. Roughly how long each set of boxes lasts." },
            { k: "Plan Changes", l: "Or: exact # changes", t: "int", min: 0, max: 60, tip: "0 = work it out from the avg time. Otherwise exactly this many changes across the clip." },
            { k: "Gap Random %", l: "Gap randomness %", t: "sl", min: 0, max: 100, tip: "0 = evenly spaced. 100 = very uneven gaps." },
            { k: PACE, l: "Pacing", t: "dd", items: ["Even", "Speeds up", "Slows down", "Busy in the middle"], vals: [0, 1, 2, 3] },
            ["Random timing"],
            { k: "Random Min s", l: "Shortest gap (s)", t: "sl", min: 0.03, max: 2, d: 2, tip: "Used when Sync to = Random timing." },
            { k: "Random Max s", l: "Longest gap (s)", t: "sl", min: 0.03, max: 3, d: 2 },
            ["Quiet zones"],
            { k: "Quiet Start s", l: "No boxes first (s)", t: "sl", min: 0, max: 3, d: 2, tip: "Keeps the start of the clip clear. Ignored on a side that's linked to a transition." },
            { k: "Quiet End s", l: "No boxes last (s)", t: "sl", min: 0, max: 3, d: 2, tip: "Keeps the end of the clip clear. Ignored on a side that's linked to a transition." },
            ["Show"],
            { k: "Timing Jitter %", l: "Pop-in jitter %", t: "sl", min: 0, max: 100, tip: "Boxes pop in at random moments inside each change instead of all at once." },
            { k: "Show Every N", l: "Show every Nth", t: "int", min: 1, max: 8, tip: "1 = every change, 2 = every other change..." },
            { k: "Show Chance %", l: "Show chance %", t: "sl", min: 0, max: 100, tip: "Randomly skip whole changes." },
            { k: "Hold %", l: "Hold %", t: "sl", min: 5, max: 100, tip: "How long boxes stay up within each change." },
            { k: "Strobe Frames", l: "Strobe (frames)", t: "int", min: 0, max: 8, tip: "0 = off. Otherwise boxes flash on/off every N frames." },
            { k: "Pop In Frames", l: "Pop-in (frames)", t: "int", min: 0, max: 12, tip: "0 = boxes appear instantly. Otherwise they scale up over N frames." },
            { k: "Pop Start %", l: "Pop starts at %", t: "sl", min: 0, max: 100 },
            { k: "Seed", l: "Seed", t: "int", min: 1, max: 999, tip: "Change to get a different random layout." }
        ],
        "Boxes": [
            ["How many"],
            { k: "Count Min", l: "Fewest boxes", t: "int", min: 0, max: 30, tip: "Each change picks a count between Fewest and Most. Keep Most (+ transition boost) <= Box pool." },
            { k: "Count Max", l: "Most boxes", t: "int", min: 0, max: 30 },
            { k: "Size Bias %", l: "Fewer = bigger %", t: "sl", min: 0, max: 100, tip: "100 = few boxes come out big, many boxes come out small." },
            { k: "Size Mix %", l: "Size mix %", t: "sl", min: 0, max: 100, tip: "Mix big and small boxes on the same change." },
            ["Size + shape"],
            { k: "Min Size %", l: "Smallest size %", t: "sl", min: 2, max: 80, tip: "Percent of frame height." },
            { k: "Max Size %", l: "Biggest size %", t: "sl", min: 5, max: 120 },
            { k: "Aspect Ratio", l: "Shape (W / H)", t: "sl", min: 0.25, max: 4, d: 2, tip: "1 = square, 1.78 = 16:9 wide, 0.56 = tall/vertical." },
            { k: "Aspect Jitter %", l: "Shape variety %", t: "sl", min: 0, max: 100 },
            ["Placement"],
            { k: "Front Chance %", l: "In front of athlete %", t: "sl", min: 0, max: 100 },
            { k: "Scatter Center", l: "Center X (px)", t: "ptx", min: 0, max: 1920 },
            { k: "Scatter Center", l: "Center Y (px)", t: "pty", min: 0, max: 1080 },
            { k: "Scatter X %", l: "Spread X %", t: "sl", min: 0, max: 150 },
            { k: "Scatter Y %", l: "Spread Y %", t: "sl", min: 0, max: 150 },
            { k: "Snap Grid", l: "Snap to grid", t: "int", min: 0, max: 12, tip: "0 = off. Otherwise box centers snap to an N x N grid." },
            { k: "Opacity %", l: "Opacity %", t: "sl", min: 0, max: 100 }
        ],
        "Motion": [
            ["Inside the box"],
            { k: "Offset Chance %", l: "Offset chance %", t: "sl", min: 0, max: 100, tip: "Chance the footage inside a box is shifted." },
            { k: "Offset Amount %", l: "Offset amount %", t: "sl", min: 0, max: 50 },
            { k: "Drift px", l: "Drift (px)", t: "sl", min: 0, max: 300, tip: "Footage slides inside the box during the hold." },
            { k: "Zoom Chance %", l: "Zoom chance %", t: "sl", min: 0, max: 100 },
            { k: "Zoom Max %", l: "Max zoom %", t: "sl", min: 100, max: 400 },
            { k: "Flip Chance %", l: "Flip chance %", t: "sl", min: 0, max: 100 },
            ["The box itself"],
            { k: "Tilt Chance %", l: "Tilt chance %", t: "sl", min: 0, max: 100 },
            { k: "Tilt Max deg", l: "Max tilt (deg)", t: "sl", min: 0, max: 45, d: 1 }
        ],
        "Looks": [
            ["Picking looks"],
            { k: LORDER, l: "Look order", t: "dd", items: ["Random (by weight)", "Cycle in order"], vals: [0, 1] },
            { k: "Look Every N", l: "Hold look for N", t: "int", min: 1, max: 8 },
            { k: "Look Mix %", l: "Look mix %", t: "sl", min: 0, max: 100, tip: "0 = all boxes in a change share one look. 100 = every box picks its own." },
            { k: "Spread Looks", l: "Spread looks out", t: "cb", tip: "On = boxes that touch or overlap never share a look, and the main look never repeats twice in a row. Turn off if you want every box on a beat in the same look." },
            { k: "Look Spacing", l: "Look spacing", t: "sl", min: 0.5, max: 4, d: 1, tip: "How far apart two boxes need to be (in box sizes) before they're allowed the same look. Higher = more mixing." },
            ["Looks: tick = on, slider = how often"],
            { k: "Normal Weight", cb: "Normal On", l: "Normal", t: "sl", min: 0, max: 100 },
            { k: "Invert Weight", cb: "Invert On", l: "Invert", t: "sl", min: 0, max: 100 },
            { k: "B&W Weight", cb: "B&W On", l: "Black & white", t: "sl", min: 0, max: 100 },
            { k: "Tint Weight", cb: "Tint On", l: "Tint", t: "sl", min: 0, max: 100 },
            { k: "Glow Weight", cb: "Glow On", l: "Glow", t: "sl", min: 0, max: 100 }
        ],
        "Grade": [
            ["All boxes"],
            { k: "All Brightness", l: "Brightness", t: "sl", min: -100, max: 100 },
            { k: "All Contrast", l: "Contrast", t: "sl", min: -50, max: 100 },
            ["Invert"],
            { k: "Invert Brightness", l: "Brightness", t: "sl", min: -100, max: 100 },
            { k: "Invert Contrast", l: "Contrast", t: "sl", min: -50, max: 100 },
            ["Black & white"],
            { k: "B&W Brightness", l: "Brightness", t: "sl", min: -100, max: 100 },
            { k: "B&W Contrast", l: "Contrast", t: "sl", min: -50, max: 100 },
            ["Tint"],
            { k: TINTPAIR, l: "Tint colors", t: "dd", items: ["Set 1 only", "Set 2 only", "Random per box"], vals: [0, 1, 2] },
            { k: "Tint Dark", l: "Set 1 shadows", t: "col" },
            { k: "Tint Light", l: "Set 1 highlights", t: "col" },
            { k: "Tint Dark 2", l: "Set 2 shadows", t: "col" },
            { k: "Tint Light 2", l: "Set 2 highlights", t: "col" },
            { k: "Tint Brightness", l: "Brightness", t: "sl", min: -100, max: 100 },
            { k: "Tint Contrast", l: "Contrast", t: "sl", min: -50, max: 100 },
            ["Glow"],
            { k: "Glow Threshold %", l: "Threshold %", t: "sl", min: 0, max: 100 },
            { k: "Glow Radius", l: "Radius", t: "sl", min: 0, max: 200 },
            { k: "Glow Intensity", l: "Intensity", t: "sl", min: 0, max: 5, d: 2 },
            { k: "Glow Brightness", l: "Brightness", t: "sl", min: -100, max: 100 },
            { k: "Glow Contrast", l: "Contrast", t: "sl", min: -50, max: 100 }
        ],
        "Parallax": [
            ["Zoom"],
            { k: PMODE, l: "Mode", t: "dd", items: ["Off", "Slow push", "Punch on beat", "Push + punch"], vals: [0, 1, 2, 3] },
            { k: "Parallax Amount %", l: "Push amount %", t: "sl", min: 0, max: 50 },
            { k: "Parallax Ease", l: "Ease in/out", t: "cb" },
            { k: "Punch Amount %", l: "Punch amount %", t: "sl", min: 0, max: 30 },
            { k: "Punch Decay s", l: "Punch decay (s)", t: "sl", min: 0.05, max: 1, d: 2 },
            ["Depth (higher = moves more)"],
            { k: "Depth Background", l: "Background", t: "sl", min: 0, max: 2, d: 2 },
            { k: "Depth Behind", l: "Boxes behind", t: "sl", min: 0, max: 2, d: 2 },
            { k: "Depth Subject", l: "Athlete", t: "sl", min: 0, max: 2, d: 2 },
            { k: "Depth Front", l: "Boxes in front", t: "sl", min: 0, max: 2, d: 2 },
            ["Camera drift"],
            { k: "Parallax Drift X px", l: "Drift X (px)", t: "sl", min: -300, max: 300 },
            { k: "Parallax Drift Y px", l: "Drift Y (px)", t: "sl", min: -300, max: 300 }
        ],
        "Transition": [
            ["How long (this player)"],
            { k: "Lead In s", l: "Start: show prev (s)", t: "sl", min: 0.05, max: 3, d: 2, tip: "How long the start of this clip shows boxes of the PREVIOUS clip, ramping down." },
            { k: "Lead Out s", l: "End: show next (s)", t: "sl", min: 0.05, max: 3, d: 2, tip: "How long the end of this clip shows boxes of the NEXT clip, ramping up to the cut." },
            ["Ramp toward the cut"],
            { k: "Count Boost", l: "Extra boxes at cut", t: "int", min: 0, max: 20, tip: "Boxes added on top of this clip's normal count, peaking right at the cut. Box pool caps the total." },
            { k: "Size Boost %", l: "Bigger at cut %", t: "sl", min: 0, max: 200, tip: "0 = transition boxes are the same size as normal. Above 0 = boxes that appear nearer the cut come out bigger (they never scale while on screen)." },
            { k: "Other Clip Start %", l: "Other clip mix %", t: "sl", min: 0, max: 100,
              tip: "Share of boxes showing the other clip at the start of the ramp. It rises to 100% at the cut, so the other clip fades in box by box." },
            { k: "Ramp Curve", l: "Ramp curve", t: "sl", min: 0.3, max: 6, d: 1, tip: "1 = builds steadily. Higher = gets busy early and stays busy." },
            { k: "Zone Change Frames", l: "Faster changes (frames)", t: "int", min: 0, max: 12,
              tip: "0 = boxes change on this clip's normal timing. Otherwise boxes re-shuffle every N frames inside the transition." }
        ]
    };
    var PAGES = ["Build", "Transition", "Beats", "Timing", "Boxes", "Motion", "Looks", "Grade", "Parallax"];

    function buildUI(thisObj) {
        var w = (thisObj instanceof Panel) ? thisObj : new Window("palette", NAME, undefined, { resizeable: true });
        w.orientation = "column"; w.alignChildren = ["fill", "top"]; w.spacing = 4; w.margins = 6;
        var assign = { bg: null, subj: null }, clip = null, loaded = [], loading = false, rows = [];

        var top = w.add("group"); top.alignChildren = ["left", "center"];
        var loadBtn = top.add("button", undefined, "Load Selected");
        loadBtn.helpTip = "Select CS Player layer(s) in the main comp, then Load. Slider changes apply to every loaded player.";
        var status = top.add("statictext", undefined, "Nothing loaded", { truncate: "end" });
        status.preferredSize.width = 260;
        var nav = w.add("group"); nav.alignChildren = ["left", "center"];
        nav.add("statictext", undefined, "Page:");
        var pageDd = nav.add("dropdownlist", undefined, PAGES); pageDd.preferredSize.width = 180;
        var stack = w.add("group"); stack.orientation = "stack"; stack.alignChildren = ["fill", "top"];
        var pages = {};
        for (var pi = 0; pi < PAGES.length; pi++) {
            var pg = stack.add("group"); pg.orientation = "column"; pg.alignChildren = ["fill", "top"]; pg.spacing = 2; pg.margins = [4, 4, 4, 4];
            pages[PAGES[pi]] = pg;
        }
        function showPage(n) {
            for (var k in pages) if (pages.hasOwnProperty(k)) pages[k].visible = (k === n);
            try { w.layout.layout(true); } catch (e) {}
        }
        pageDd.onChange = function () { if (pageDd.selection) showPage(pageDd.selection.text); };
        function refreshUI() { try { if (w.update) w.update(); } catch (e) {} }

        // ---------- which players are we working on: selected in the comp, else the last loaded ----------
        function loadedList() {
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                var ps = selectedPlayers(comp);
                if (ps.length) {
                    var changed = ps.length !== loaded.length;
                    for (var i = 0; !changed && i < ps.length; i++) { try { if (ps[i].name !== loaded[i].name) changed = true; } catch (e) { changed = true; } }
                    loaded = ps;
                    if (changed) loadRows();
                    return loaded;
                }
            }
            var ok = [];
            for (var j = 0; j < loaded.length; j++) { try { if (loaded[j].name) ok.push(loaded[j]); } catch (e2) {} }
            loaded = ok;
            return loaded;
        }
        function put(s, v) {
            if (loading) return;
            var ps = loadedList();
            if (!ps.length) { status.text = "Select CS Player(s) first"; return; }
            app.beginUndoGroup(NAME + ": " + s.l);
            try {
                for (var i = 0; i < ps.length; i++) {
                    if (s.t === "ptx" || s.t === "pty") {
                        var cur = getCtl(ps[i], s.k); if (cur === null) continue;
                        var nv = [cur[0], cur[1]]; nv[s.t === "ptx" ? 0 : 1] = v;
                        setCtl(ps[i], s.k, nv);
                    } else setCtl(ps[i], s.k, v);
                    if (s.k === "Lead In s" || s.k === "Lead Out s") trimTwins(ps[i]);
                }
            } catch (e) { status.text = "Error: " + e.toString(); }
            app.endUndoGroup();
        }
        function read(L, s) {
            var v = getCtl(L, s.k);
            if (v === null) return null;
            if (s.t === "ptx") return v[0];
            if (s.t === "pty") return v[1];
            return v;
        }
        function header(par, txt) {
            var st = par.add("statictext", undefined, txt.toUpperCase());
            try { st.graphics.font = ScriptUI.newFont(st.graphics.font.name, "BOLD", st.graphics.font.size); } catch (e) {}
        }
        function rowGroup(par, s) {
            var g = par.add("group"); g.alignChildren = ["left", "center"]; g.spacing = 4;
            var lw = 128;
            if (s.cb) {
                var tick = g.add("checkbox", undefined, ""); lw = 108;
                var cs = { k: s.cb, l: s.l + " on", t: "cb" };
                tick.onClick = function () { put(cs, tick.value ? 1 : 0); };
                rows.push(function (L) { var v = getCtl(L, s.cb); if (v !== null) tick.value = v > 0; });
            }
            var lb = g.add("statictext", undefined, s.l); lb.preferredSize.width = lw;
            if (s.tip) { lb.helpTip = s.tip; g.helpTip = s.tip; }
            return g;
        }
        function sliderRow(par, s) {
            var g = rowGroup(par, s), dec = s.t === "int" ? 0 : (s.d || 0), f = Math.pow(10, dec);
            var sl = g.add("slider", undefined, s.min, s.min, s.max); sl.preferredSize.width = 140;
            var et = g.add("edittext", undefined, String(s.min)); et.characters = 6;
            if (s.tip) { sl.helpTip = s.tip; et.helpTip = s.tip; }
            function rnd(v) { return Math.round(v * f) / f; }
            sl.onChanging = function () { et.text = String(rnd(sl.value)); };
            sl.onChange = function () { var v = rnd(sl.value); et.text = String(v); put(s, v); };
            et.onChange = function () {
                var v = parseFloat(et.text); if (isNaN(v)) return;
                v = rnd(v); sl.value = Math.max(sl.minvalue, Math.min(sl.maxvalue, v)); put(s, v);
            };
            rows.push(function (L) {
                if (s.t === "ptx") sl.maxvalue = L.width;
                if (s.t === "pty") sl.maxvalue = L.height;
                var v = read(L, s); if (v === null) return;
                sl.value = Math.max(sl.minvalue, Math.min(sl.maxvalue, v)); et.text = String(rnd(v));
            });
        }
        function checkRow(par, s) {
            var g = rowGroup(par, s), cb = g.add("checkbox", undefined, "");
            cb.onClick = function () { put(s, cb.value ? 1 : 0); };
            rows.push(function (L) { var v = read(L, s); if (v !== null) cb.value = v > 0; });
        }
        function ddRow(par, s) {
            var g = rowGroup(par, s), dd = g.add("dropdownlist", undefined, s.items); dd.preferredSize.width = 190;
            dd.selection = 0;
            dd.onChange = function () { if (dd.selection && !loading) put(s, s.vals[dd.selection.index]); };
            rows.push(function (L) {
                var v = read(L, s); if (v === null) return;
                var best = 0, bd = 1e9;
                for (var i = 0; i < s.vals.length; i++) { var d = Math.abs(s.vals[i] - v); if (d < bd) { bd = d; best = i; } }
                dd.selection = best;
            });
        }
        function colorRow(par, s) {
            var g = rowGroup(par, s);
            var sw = g.add("panel", undefined, ""); sw.preferredSize = [44, 18];
            var bt = g.add("button", undefined, "Pick..."); bt.preferredSize.width = 60;
            var cur = [1, 1, 1, 1];
            function paint() { try { sw.graphics.backgroundColor = sw.graphics.newBrush(sw.graphics.BrushType.SOLID_COLOR, [cur[0], cur[1], cur[2], 1]); sw.hide(); sw.show(); } catch (e) {} }
            bt.onClick = function () {
                var hex = (Math.round(cur[0] * 255) << 16) | (Math.round(cur[1] * 255) << 8) | Math.round(cur[2] * 255);
                var r = $.colorPicker(hex); if (r < 0) return;
                cur = [((r >> 16) & 255) / 255, ((r >> 8) & 255) / 255, (r & 255) / 255, 1];
                paint(); put(s, cur);
            };
            rows.push(function (L) { var v = read(L, s); if (v === null) return; cur = [v[0], v[1], v[2], 1]; paint(); });
            paint();
        }
        function addRows(par, list) {
            for (var r = 0; r < list.length; r++) {
                var s = list[r];
                if (s instanceof Array) { header(par, s[0]); continue; }
                if (s.t === "cb") checkRow(par, s);
                else if (s.t === "dd") ddRow(par, s);
                else if (s.t === "col") colorRow(par, s);
                else sliderRow(par, s);
            }
        }
        function linkText(L) {
            var main = L.containingComp, p = linkOf(L, "prev"), n = linkOf(L, "next"), P0 = p ? findPlayerByUid(main, p) : null, N0 = n ? findPlayerByUid(main, n) : null;
            if (!P0 && !N0) return "";
            return "  [" + (P0 ? shortPlayerName(P0.name) + " > " : "") + "this" + (N0 ? " > " + shortPlayerName(N0.name) : "") + "]";
        }
        function loadRows() {
            if (!loaded.length) { status.text = "Nothing loaded"; return; }
            loading = true;
            try { for (var i = 0; i < rows.length; i++) { try { rows[i](loaded[0]); } catch (e1) {} } } catch (e) {}
            loading = false;
            var L = loaded[0], lt = "";
            try { lt = linkText(L); } catch (e2) {}
            status.text = shortPlayerName(L.name) + (loaded.length > 1 ? " (+" + (loaded.length - 1) + ")" : "") + lt +
                          (isBaked(L) ? "  BAKED: sliders won't change it until you Unbake/Rebuild" : "");
        }
        function loadSel() {
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) { var ps = selectedPlayers(comp); if (ps.length) loaded = ps; }
            loadedList();
            if (!loaded.length) { status.text = "Select CS Player(s) in the main comp, then Load"; return; }
            loadRows();
        }
        loadBtn.onClick = loadSel;

        function opts() { return { pool: Math.max(0, Math.min(40, Math.round(num(poolEt, 12)))), trPool: Math.max(1, Math.min(20, Math.round(num(trPoolEt, 8)))) }; }
        function tick(label) { return function (i, n) { status.text = label + " " + (i + 1) + " / " + n + "..."; refreshUI(); }; }
        function report(notes) { if (notes.length) alert(notes.join("\n")); }
        function after(comp) { try { var ps = selectedPlayers(comp); if (ps.length) loaded = ps; loadRows(); } catch (e) {} }
        function eachSel(label, fn) { // selected players, or the loaded ones if nothing is selected
            var comp = getComp(); if (!comp) return 0;
            var n = 0;
            run(label, function () {
                var ps = selectedPlayers(comp);
                if (!ps.length) ps = loadedList();
                for (var i = 0; i < ps.length; i++) { fn(ps[i]); n++; }
                if (!n) alert("Select player layer(s) in the main comp (or Load them first).");
            });
            after(comp);
            return n;
        }
        function applySet(L, pr) { var n = 0; for (var k in pr) if (pr.hasOwnProperty(k) && getCtl(L, k) !== null) { setCtl(L, k, pr[k]); n++; } return n; }

        // ---------- Build page ----------
        var pB = pages["Build"];
        header(pB, "Player setup");
        var ga = pB.add("group"); ga.alignChildren = ["left", "center"];
        ga.add("statictext", undefined, "Background:").preferredSize.width = 80;
        var bgTxt = ga.add("statictext", undefined, "(none)", { truncate: "end" }); bgTxt.preferredSize.width = 160;
        var setBg = ga.add("button", undefined, "Set");
        var gb = pB.add("group"); gb.alignChildren = ["left", "center"];
        gb.add("statictext", undefined, "Athlete roto:").preferredSize.width = 80;
        var sbTxt = gb.add("statictext", undefined, "(none)", { truncate: "end" }); sbTxt.preferredSize.width = 160;
        var setSb = gb.add("button", undefined, "Set");
        var gc = pB.add("group");
        gc.add("statictext", undefined, "Box pool:");
        var poolEt = gc.add("edittext", undefined, "12"); poolEt.characters = 3;
        poolEt.helpTip = "Max boxes per player (per front/behind layer). Keep 'Most boxes' + 'Extra boxes at cut' around this.";
        var buildBtn = pB.add("button", undefined, "Build Player (assigned, or select BG + roto)");
        var batchBtn = pB.add("button", undefined, "Batch: Build Every Pair in Selection");
        var gd = pB.add("group"); gd.alignChildren = ["fill", "center"];
        var rebBtn = gd.add("button", undefined, "Rebuild Selected");
        rebBtn.helpTip = "Rebuilds the selected players (keeps settings, seed and transition links). Upgrades v4/v5 players to v6.";
        var rmBtn = gd.add("button", undefined, "Remove Boxes");
        var gd2 = pB.add("group"); gd2.alignChildren = ["fill", "center"];
        var repBtn = gd2.add("button", undefined, "Repair Comp");
        repBtn.helpTip = "Cleans up older versions (incl. v5 transition layers, which become links) and rebuilds every player in this comp.";
        var tidyBtn = gd2.add("button", undefined, "Tidy Project Panel");

        header(pB, "Inputs (selected player)");
        var gi0 = pB.add("group"); gi0.alignChildren = ["fill", "center"];
        var openFullBtn = gi0.add("button", undefined, "Open Full (retime)");
        openFullBtn.helpTip = "The clip at its own size. Speed-ramp it here with Time Remap (already switched on); boxes + transitions follow.";
        var openRotoBtn = gi0.add("button", undefined, "Open Roto");
        openRotoBtn.helpTip = "The athlete roto at its own size. Re-roto here after a retime.";
        var gi1 = pB.add("group"); gi1.alignChildren = ["fill", "center"];
        var followBtn = gi1.add("button", undefined, "Roto Follows Full Timing");
        followBtn.helpTip = "Links the roto clip's timing to the Full clip, so you only ramp once (in Full). Re-roto after linking or retiming.";
        var unfollowBtn = gi1.add("button", undefined, "Unlink Roto Timing");
        var gi = pB.add("group"); gi.alignChildren = ["fill", "center"];
        var openCropBtn = gi.add("button", undefined, "Open Crop Source");
        openCropBtn.helpTip = "Opens the comp the boxes are cut from. Drop a different clip in there to crop from another shot.";
        var setCropBtn = gi.add("button", undefined, "Crop From Project Selection");
        setCropBtn.helpTip = "Select a player in the comp AND a clip in the Project panel, then click: that clip becomes what the boxes are cut from.";

        header(pB, "Quick looks");
        var lkNames = ["Subtle", "Hype", "Chaos", "Bold", "Flash"], lb = {};
        var l1 = pB.add("group"); l1.alignChildren = ["fill", "center"];
        for (var i = 0; i < lkNames.length; i++) lb[lkNames[i]] = l1.add("button", undefined, lkNames[i]);
        var l3 = pB.add("group"); l3.alignChildren = ["fill", "center"];
        var seedBtn = l3.add("button", undefined, "New Seed");
        var copyBtn = l3.add("button", undefined, "Copy Settings");
        var pasteBtn = l3.add("button", undefined, "Paste Settings");

        header(pB, "My presets");
        var gp1 = pB.add("group"); gp1.alignChildren = ["left", "center"];
        var presetDd = gp1.add("dropdownlist", undefined, []); presetDd.preferredSize.width = 180;
        var presetApply = gp1.add("button", undefined, "Apply");
        var presetDel = gp1.add("button", undefined, "Delete");
        var gp2 = pB.add("group"); gp2.alignChildren = ["fill", "center"];
        var presetSave = gp2.add("button", undefined, "Save Current...");
        presetSave.helpTip = "Saves the selected player's style (looks, timing style, boxes, motion, grade, parallax, transition) into After Effects. Not the BPM, seed or links.";
        var presetImport = gp2.add("button", undefined, "Import...");
        presetImport.helpTip = "Add .cspreset file(s), e.g. ones you or a friend exported.";
        var presetExport = gp2.add("button", undefined, "Export...");

        header(pB, "Bake");
        var bk1 = pB.add("group"); bk1.alignChildren = ["fill", "center"];
        var bakeBtn = bk1.add("button", undefined, "Bake Selected to Keyframes");
        var keepCb = bk1.add("checkbox", undefined, "Keep backup"); keepCb.value = true;
        keepCb.helpTip = "Saves a full live copy (with expressions) in Crop Scatter > Backups before baking, so you can Unbake.";
        var unbakeBtn = pB.add("button", undefined, "Unbake Selected (restore backup)");
        var helpBtn = pB.add("button", undefined, "How to use");

        // ---------- Transition page ----------
        var pT = pages["Transition"];
        header(pT, "Link clips");
        var tp0 = pT.add("group");
        tp0.add("statictext", undefined, "Transition box pool:");
        var trPoolEt = tp0.add("edittext", undefined, "8"); trPoolEt.characters = 3;
        trPoolEt.helpTip = "Boxes per side (front/behind) that can show the other clip. Lower = lighter + safer for AE. Rebuild to apply.";
        var trLinkBtn = pT.add("button", undefined, "Link Selected Players (in time order)");
        trLinkBtn.helpTip = "Select 2+ players. Each one transitions into the next one that starts within 1 s of its end.";
        var trUnlinkBtn = pT.add("button", undefined, "Unlink Selected");
        header(pT, "Transition presets");
        var t3 = pT.add("group"); t3.alignChildren = ["fill", "center"];
        var trNames = ["Smooth", "Build", "Flicker"], trb = {};
        for (var ti = 0; ti < trNames.length; ti++) trb[trNames[ti]] = t3.add("button", undefined, trNames[ti]);
        trb["Smooth"].helpTip = "Gentle: a few extra boxes, other clip fades in steadily.";
        trb["Build"].helpTip = "Busy: lots of extra boxes that grow, fast re-shuffles near the cut.";
        trb["Flicker"].helpTip = "Short and rapid: boxes re-shuffle every 2 frames.";
        addRows(pT, SPEC["Transition"]);

        // ---------- Beats page ----------
        var pBt = pages["Beats"];
        header(pBt, "Beat tools (selected players)");
        var g3 = pBt.add("group");
        g3.add("statictext", undefined, "BPM:");
        var bpmEt = g3.add("edittext", undefined, "120"); bpmEt.characters = 6;
        var tapBtn = g3.add("button", undefined, "Tap");
        var applyBpm = g3.add("button", undefined, "Apply BPM");
        var g3a = pBt.add("group"); g3a.alignChildren = ["fill", "center"];
        var downBtn = g3a.add("button", undefined, "Downbeat = Playhead");
        var onBtn = g3a.add("button", undefined, "On Beat");
        var offBtn = g3a.add("button", undefined, "Off Beat");
        header(pBt, "Music to markers");
        var g3b = pBt.add("group");
        g3b.add("statictext", undefined, "Threshold %");
        var thrEt = g3b.add("edittext", undefined, "60"); thrEt.characters = 4;
        g3b.add("statictext", undefined, "Min gap s");
        var gapEt = g3b.add("edittext", undefined, "0.18"); gapEt.characters = 5;
        var g3c = pBt.add("group"); g3c.alignChildren = ["fill", "center"];
        var musicBtn = g3c.add("button", undefined, "Music -> Beat Markers");
        var clearBtn = g3c.add("button", undefined, "Clear Beat Markers");

        var setPages = ["Timing", "Boxes", "Motion", "Looks", "Grade", "Parallax"];
        for (var sp = 0; sp < setPages.length; sp++) addRows(pages[setPages[sp]], SPEC[setPages[sp]]);

        // ---------- build actions ----------
        setBg.onClick = function () {
            var c = getComp(); if (!c) return;
            var s = c.selectedLayers;
            if (s.length !== 1 || !isPlainAV(s[0])) { alert("Select your background layer."); return; }
            assign.bg = s[0].name; bgTxt.text = s[0].name;
        };
        setSb.onClick = function () {
            var c = getComp(); if (!c) return;
            var s = c.selectedLayers;
            if (s.length === 0) { assign.subj = null; sbTxt.text = "(none)"; return; }
            if (s.length !== 1 || !isPlainAV(s[0])) { alert("Select your roto layer (or nothing to clear)."); return; }
            assign.subj = s[0].name; sbTxt.text = s[0].name;
        };
        buildBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            run("Build Player", function () {
                var notes = [], bgN, sbN;
                if (assign.bg) { bgN = assign.bg; sbN = assign.subj; }
                else {
                    var pr = autoPairs(comp.selectedLayers);
                    if (pr.length !== 1) { alert("Assign a Background (and roto), or select exactly one BG + roto pair."); return; }
                    bgN = pr[0].bg; sbN = pr[0].subj;
                }
                var bg = layerByName(comp, bgN), sb = sbN ? layerByName(comp, sbN) : null;
                if (!bg) { alert("Background layer not found in this comp."); return; }
                buildPlayer(comp, bg, sb, opts(), notes);
                assign.bg = null; assign.subj = null; bgTxt.text = "(none)"; sbTxt.text = "(none)";
                report(notes);
            });
            after(comp);
        };
        batchBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            var pr = autoPairs(comp.selectedLayers), notes = [], o = opts(), withSub = 0, ctx = { done: {} };
            if (!pr.length) { alert("Select all your BG + roto layers first."); return; }
            runEach("Batch Build", pr, function (it) {
                var bg = layerByName(comp, it.bg), sb = it.subj ? layerByName(comp, it.subj) : null;
                if (!bg) return;
                if (sb) withSub++;
                buildPlayer(comp, bg, sb, o, notes, ctx);
            }, tick("Building"));
            notes.unshift("Built " + pr.length + " player(s), " + withSub + " with a roto.");
            report(notes);
            status.text = "Done";
        };
        rebBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            var ps = selectedPlayers(comp), notes = [], o = opts(), ctx = { done: {} };
            if (!ps.length) { alert("Select player layer(s) in the main comp."); return; }
            runEach("Rebuild", ps, function (L) { fillPlayer(comp, L, o, notes, ctx); }, tick("Rebuilding"));
            report(notes);
            after(comp);
        };
        rmBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            run("Remove Boxes", function () {
                var ps = selectedPlayers(comp), notes = [];
                for (var i = 0; i < ps.length; i++) {
                    var pc = ps[i].source;
                    removeCrops(pc);
                    for (var k = 1; k <= pc.numLayers; k++) if (hasRole(pc.layer(k), "bg") || hasRole(pc.layer(k), "sub")) { restorePre(pc.layer(k), notes); clearParallax(pc.layer(k)); }
                }
            });
        };
        repBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            var res = null, o = opts(), ctx = { done: {} };
            run("Repair cleanup", function () { res = repairComp(comp, o); });
            if (!res) return;
            runEach("Repair", res.todo, function (L) { fillPlayer(comp, L, o, res.notes, ctx); }, tick("Repairing"));
            run("Repair purge", function () { var n = purgeOrphanComps(); if (n) res.notes.push("Deleted " + n + " unused crop comp(s)."); });
            report(res.notes);
            after(comp);
        };
        tidyBtn.onClick = function () { run("Tidy Project", function () {}); };

        function firstPlayer() {
            var comp = getComp(); if (!comp) return null;
            var ps = selectedPlayers(comp); if (!ps.length) ps = loadedList();
            if (!ps.length) { alert("Select a player first."); return null; }
            return ps[0];
        }
        function openInput(role) {
            var L = firstPlayer(); if (!L) return;
            var c = findItem("CS_IN:" + uidOf(L) + ":" + role);
            if (!c) { alert("This player doesn't have that input yet. Hit Rebuild Selected first."); return; }
            c.openInViewer();
        }
        openFullBtn.onClick = function () { openInput("full"); };
        openRotoBtn.onClick = function () { openInput("roto"); };
        function follow(on) {
            var comp = getComp(); if (!comp) return;
            var lines = [];
            run(on ? "Roto Follows Full" : "Unlink Roto Timing", function () {
                var ps = selectedPlayers(comp); if (!ps.length) ps = loadedList();
                if (!ps.length) { alert("Select a player first."); return; }
                for (var i = 0; i < ps.length; i++) { var why = setRotoFollow(ps[i], on); lines.push(shortPlayerName(ps[i].name) + ": " + (why || (on ? "roto now follows Full's timing" : "roto timing unlinked"))); }
            });
            if (lines.length) alert(lines.join("\n") + (on ? "\n\nRe-roto after this (and after any retime): Open Roto, refine the Roto Brush, Freeze." : ""));
        }
        followBtn.onClick = function () { follow(true); };
        unfollowBtn.onClick = function () { follow(false); };
        openCropBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            var ps = selectedPlayers(comp); if (!ps.length) ps = loadedList();
            if (!ps.length) { alert("Select a player first."); return; }
            var c = findItem("CS_IN:" + uidOf(ps[0]) + ":crop");
            if (!c) { alert("This player has no Crop Source yet. Hit Rebuild Selected first."); return; }
            c.openInViewer();
        };
        setCropBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            var sel = app.project.selection, item = null;
            for (var i = 0; i < sel.length; i++) if ((sel[i] instanceof FootageItem || sel[i] instanceof CompItem) && sel[i] !== comp) { item = sel[i]; break; }
            if (!item) { alert("Select the clip you want to crop from in the Project panel (keep the player selected in the comp)."); return; }
            var n = 0, miss = 0;
            run("Set Crop Source", function () {
                var ps = selectedPlayers(comp); if (!ps.length) ps = loadedList();
                for (var k = 0; k < ps.length; k++) { if (setCropSource(ps[k], item)) n++; else miss++; }
            });
            alert(n ? n + " player(s) now crop from '" + item.name + "'.\nIt starts at the clip's first frame; open the Crop Source to slide or trim it." + (miss ? "\n" + miss + " player(s) need Rebuild Selected first." : "")
                    : "No player found. Select a CS Player in the comp (or Load one) and try again.");
        };

        function bindLook(n) { lb[n].onClick = function () { eachSel("Look " + n, function (L) { applySet(L, ALL_ON); applySet(L, LOOK_PRESETS[n]); }); }; }
        for (var a = 0; a < lkNames.length; a++) bindLook(lkNames[a]);
        function bindTR(n) { trb[n].onClick = function () { eachSel("Transition " + n, function (L) { applySet(L, TR_PRESETS[n]); }); }; }
        for (var b = 0; b < trNames.length; b++) bindTR(trNames[b]);
        seedBtn.onClick = function () { eachSel("New Seed", function (L) { setCtl(L, "Seed", 1 + Math.floor(Math.random() * 999)); }); };
        copyBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            var ps = selectedPlayers(comp); if (!ps.length) ps = loadedList();
            if (!ps.length) { alert("Select one player to copy from."); return; }
            clip = {};
            for (var i = 0; i < CONTROLS.length; i++) {
                var n = CONTROLS[i][0];
                if (CONTROLS[i][1] === "sep" || PRESET_SKIP[n]) continue;
                var v = getCtl(ps[0], n); if (v !== null) clip[n] = v;
            }
            alert("Copied settings from " + shortPlayerName(ps[0].name) + " (not seed, BPM, quiet zones or links).");
        };
        pasteBtn.onClick = function () {
            if (!clip) { alert("Copy settings first."); return; }
            eachSel("Paste Settings", function (L) { applySet(L, clip); });
        };

        // ---------- presets ----------
        function fillPresets(pick) {
            presetDd.removeAll();
            var names = presetNames();
            for (var i = 0; i < names.length; i++) presetDd.add("item", names[i]);
            if (names.length) { presetDd.selection = 0; for (var j = 0; j < names.length; j++) if (names[j] === pick) presetDd.selection = j; }
        }
        presetSave.onClick = function () {
            var comp = getComp(); if (!comp) return;
            var ps = selectedPlayers(comp); if (!ps.length) ps = loadedList();
            if (!ps.length) { alert("Select (or Load) the player whose settings you want to save."); return; }
            var nm = prompt("Name this preset:", ""); if (!nm) return;
            nm = nm.replace(/[\r\n]/g, " ");
            var names = presetNames();
            for (var i = 0; i < names.length; i++) if (names[i] === nm && !confirm("Replace the preset '" + nm + "'?")) return;
            try {
                storePreset(nm, presetText(ps[0], nm));
                var back = loadPreset(nm);
                fillPresets(nm);
                alert("Saved '" + nm + "' from " + shortPlayerName(ps[0].name) + " (" + (back ? back.n : 0) + " settings).");
            } catch (e) { alert("Couldn't save the preset: " + e.toString()); }
        };
        presetApply.onClick = function () {
            if (!presetDd.selection) { alert("No presets yet. Save one, or Import a .cspreset file."); return; }
            var pr = loadPreset(presetDd.selection.text);
            if (!pr || !pr.n) { alert("That preset is empty or couldn't be read."); return; }
            var total = 0;
            var n = eachSel("Preset " + pr.name, function (L) { total += applySet(L, pr.vals); });
            if (n) status.text = "Applied '" + pr.name + "' to " + n + " player(s), " + Math.round(total / n) + " settings each";
        };
        presetDel.onClick = function () {
            if (!presetDd.selection) return;
            var nm = presetDd.selection.text;
            if (!confirm("Delete the preset '" + nm + "'?")) return;
            deletePreset(nm); fillPresets();
        };
        presetImport.onClick = function () {
            var files = File.openDialog("Pick .cspreset file(s) to import", "*.cspreset", true);
            if (!files) return;
            if (!(files instanceof Array)) files = [files];
            var got = [], last = null;
            for (var i = 0; i < files.length; i++) {
                var t = readTextFile(files[i]); if (!t) continue;
                var pr = parsePresetText(t, decodeURI(files[i].name).replace(/\.cspreset$/i, ""));
                if (!pr.n) continue;
                storePreset(pr.name, t); got.push(pr.name + " (" + pr.n + ")"); last = pr.name;
            }
            fillPresets(last);
            alert(got.length ? "Imported:\n" + got.join("\n") : "Nothing imported. Make sure the files are .cspreset text files.");
        };
        presetExport.onClick = function () {
            if (!presetDd.selection) { alert("Pick a preset to export."); return; }
            var nm = presetDd.selection.text, t = longGet(presetKey(nm));
            var f = File.saveDialog("Export preset", "*.cspreset"); if (!f) return;
            if (!/\.cspreset$/i.test(f.name)) f = new File(f.fsName + ".cspreset");
            if (writeText(f, t)) alert("Exported to " + f.fsName);
            else alert("Couldn't write the file. Turn on Settings > Scripting & Expressions > Allow Scripts to Write Files.");
        };

        // ---------- bake ----------
        bakeBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            var ps = selectedPlayers(comp);
            if (!ps.length) { alert("Select player layer(s) to bake."); return; }
            if (!confirm("Bake " + ps.length + " player(s) to keyframes?\n\nThis can take a while per player on a slow machine.\n" +
                         "Afterwards the sliders won't affect them." + (keepCb.value ? " A live backup is kept so you can Unbake." : ""))) return;
            run("Bake", function () {
                var lines = [], t0 = new Date().getTime();
                for (var i = 0; i < ps.length; i++) {
                    if (isBaked(ps[i])) { lines.push(ps[i].name + ": already baked, skipped (Unbake or Rebuild first)."); continue; }
                    var st = bakeItem(ps[i], function (s) { if (s.layers % 4 === 0) { status.text = "Baking " + s.name + "  (" + s.layers + " layers)"; refreshUI(); } }, keepCb.value);
                    lines.push(ps[i].name + ": " + st.props + " properties baked");
                }
                lines.push("Done in " + Math.round((new Date().getTime() - t0) / 1000) + " s.");
                alert(lines.join("\n"));
            });
            after(comp);
        };
        unbakeBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            run("Unbake", function () {
                var ps = selectedPlayers(comp), notes = [], n = 0;
                if (!ps.length) { alert("Select baked player layer(s)."); return; }
                for (var i = 0; i < ps.length; i++) {
                    if (!isBaked(ps[i])) { notes.push(ps[i].name + ": not baked."); continue; }
                    if (restoreBackup(ps[i], notes)) n++;
                }
                notes.unshift("Restored " + n + " player(s) to live.");
                report(notes);
            });
            after(comp);
        };

        // ---------- transitions ----------
        trLinkBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            var ps = selectedPlayers(comp), notes = [], o = opts(), ctx = { done: {} }, res = null;
            if (ps.length < 2) { alert("Select 2 or more players (the clips you want to transition between)."); return; }
            run("Link Players", function () { res = linkPlayers(comp, ps, o, notes); });
            if (!res || !res.pairs) { alert("Nothing linked: the selected players need to be back to back (less than 1 s apart)."); return; }
            runEach("Link", res.touched, function (L) { fillPlayer(comp, L, o, notes, ctx); }, tick("Linking"));
            notes.unshift("Linked " + res.pairs + " cut(s). Each player's start/end now crops the neighbouring clip.");
            report(notes);
            after(comp);
        };
        trUnlinkBtn.onClick = function () {
            var comp = getComp(); if (!comp) return;
            var ps = selectedPlayers(comp), notes = [], o = opts(), ctx = { done: {} }, touched = [];
            if (!ps.length) { alert("Select the player(s) to unlink."); return; }
            run("Unlink Players", function () { touched = unlinkPlayers(comp, ps, o, notes); });
            runEach("Unlink", touched, function (L) { fillPlayer(comp, L, o, notes, ctx); }, tick("Unlinking"));
            report(notes);
            after(comp);
        };

        // ---------- beats ----------
        var taps = [];
        tapBtn.onClick = function () {
            var now = new Date().getTime();
            if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
            taps.push(now); if (taps.length > 8) taps.shift();
            if (taps.length >= 2) bpmEt.text = String(Math.round(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)) * 10) / 10);
        };
        applyBpm.onClick = function () { var v = num(bpmEt, 120); eachSel("Apply BPM", function (L) { setCtl(L, "BPM", v); setCtl(L, SYNC, 0); }); };
        downBtn.onClick = function () { var comp = getComp(); if (!comp) return; var t = comp.time; eachSel("Downbeat", function (L) { setCtl(L, "Beat Offset", t); }); };
        onBtn.onClick = function () { eachSel("On Beat", function (L) { setCtl(L, "Phase Beats", 0); }); };
        offBtn.onClick = function () { eachSel("Off Beat", function (L) { setCtl(L, "Phase Beats", 0.5); }); };
        musicBtn.onClick = function () { var comp = getComp(); if (!comp) return; run("Music to Markers", function () { musicToMarkers(comp, num(thrEt, 60), num(gapEt, 0.18)); }); after(comp); };
        clearBtn.onClick = function () { var comp = getComp(); if (!comp) return; run("Clear Beat Markers", function () { alert(clearBeatMarkers(comp) + " beat markers removed."); }); };

        helpBtn.onClick = function () {
            alert(
                "CROP SCATTER v6.2\n\n" +
                "PLAYERS: stack the athlete roto over its background clip, select both > Build Player.\n" +
                "Lots of players: select all the BG + roto layers > Batch.\n" +
                "Each player gets Project panel > Crop Scatter > Players > <name> > Inputs:\n" +
                "  Full, Roto, and Crop Source (what the boxes are cut from; swap in another clip with\n" +
                "  'Crop From Project Selection' or by editing that comp).\n\n" +
                "RETIME: Open Full (retime) and speed-ramp the clip there (Time Remap is already on).\n" +
                "'Roto Follows Full Timing' makes the roto use the same ramp; re-roto after retiming.\n\n" +
                "TRANSITIONS: Page > Transition. Select players in order > Link Selected.\n" +
                "The end of each clip starts cropping the next clip (more + bigger boxes toward the cut),\n" +
                "and the start of the next clip crops the previous one, ramping back down.\n\n" +
                "EDIT: select player(s) > Load Selected, pick a page. Changes apply to all loaded players.\n" +
                "Timing > Sync to 'Spread over clip' = random changes planned across the clip length.\n\n" +
                "PRESETS: Save Current... stores the style inside After Effects. Import/Export = .cspreset files.\n\n" +
                "BAKE: select players > Bake Selected. A live backup goes in Crop Scatter > Backups;\n" +
                "Unbake Selected swaps it back.\n\n" +
                "Renamed the main comp or a player? Hit Repair Comp."
            );
        };

        fillPresets();
        pageDd.selection = 0;
        showPage("Build");
        w.layout.layout(true);
        w.onResizing = w.onResize = function () { this.layout.resize(); };
        if (w instanceof Window) { w.center(); w.show(); }
        return w;
    }

    buildUI(thisObj);

})(this);
