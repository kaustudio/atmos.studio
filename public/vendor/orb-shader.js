// Atmos Studio — minimal raw-WebGL orb renderer (Part B). No three.js. One quad + one fragment
// shader per orb canvas: sphere shading + palette gradient + FBM turbulence + fresnel + specular.
// The shader is a RENDERER, not a system: every uniform is fed from the orbit engine's existing
// computations. The DOM orb stack is the permanent floor — any failure here → caller restores it.
(function(){
  var VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS=[
'precision mediump float;',
'uniform vec2 u_res;uniform float u_t,u_seed,u_li,u_str,u_m,u_d;uniform vec2 u_l;',
'uniform vec3 u_c0,u_c1,u_c2,u_c3,u_c4;',
'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+u_seed)*43758.5453);}',
'float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
'void main(){',
' vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.;',
' float r=length(uv); if(r>1.0){discard;}',
' vec3 n=vec3(uv, sqrt(max(0.,1.-r*r)));',
// living gradient surface — domain-warped, slowly rotating multi-stop palette gradient
// (the tool's soft gradient-field language) with FBM churn moving the blend borders
' vec2 q=uv*(1.35+.14*sin(u_t*.21+u_seed));',
' float w1=fbm(q*1.2+vec2(u_t*.20,-u_t*.16));',
' float w2=fbm(q*2.3-vec2(u_t*.14,u_t*.18)+w1);',
' float w3=fbm(q*3.6+vec2(-u_t*.11,u_t*.13)+w2*.7);',
' vec2 wp=uv+vec2(w1-.5,w2-.5)*(.50+.26*sin(u_t*.31+u_seed*2.))+vec2(w3-.5,w1-.5)*.18;',
' float ang=u_t*.24+u_seed;',
' vec2 dir=vec2(cos(ang),sin(ang));',
' float g=dot(wp,dir)*.5+.5;',
' vec3 base=mix(u_c0,u_c1,smoothstep(.05,.62,g));',
' base=mix(base,u_c2,smoothstep(.45,1.,g));',
' base=mix(base,u_c3,smoothstep(.35,.90,w2)*.45);',
' base=mix(base,u_c0,smoothstep(.60,1.,w1)*.30);',
' base=mix(base,u_c1,smoothstep(.55,.95,w3)*.22);',
// one fixed room light — direction AND distance from the engine (u_l, u_m). Near the lamp the
// light sits high (frontal, soft terminator); far away it grazes (low z, hard directional shading)
// and exposure falls off — two orbs across the ring are visibly lit differently.
' vec3 L=normalize(vec3(u_l*(.55+.80*u_m),mix(.95,.34,u_m)));',
' float dif=clamp(dot(n,L)*.5+.5,0.,1.); dif=pow(dif,mix(1.15,1.6,u_m));',
// ring depth gates the key light: at the back the lamp barely reaches — shading flattens toward
// ambient and the terminator softens; the key belongs to the front of the room.
' dif=mix(.48,dif,mix(.30,1.,u_d));',
' vec3 col=base*(0.34+0.72*dif)*(1.05-.20*u_m);',
' col=mix(u_c4*.9,col,smoothstep(0.,.55,dif));',
// specular pair: tight anisotropic primary (u_str = engine travel stretch) + broad low lobe
' vec3 V=vec3(0.,0.,1.);vec3 H=normalize(L+V);',
' vec2 st=vec2(1./max(u_str,.001),u_str);',
' float spA=pow(clamp(dot(normalize(n*vec3(st,1.)),H),0.,1.),90.);',
' float spB=pow(clamp(dot(n,H),0.,1.),18.);',
' col+=vec3(1.,.98,.94)*(spA*.55+spB*.16)*u_li*(u_d*u_d);',
// fresnel rim opposite the light + thin-film sheen hue at grazing angles
' float fr=pow(1.-n.z,2.6);',
' float away=clamp(dot(normalize(uv+vec2(1e-4)),-normalize(u_l)),0.,1.);',
' col+=mix(u_c2,u_c1,.5)*fr*away*(.22+.34*u_m)*(.35+.65*u_d);',
' col+=mix(vec3(.55,.69,.85),vec3(.85,.65,.50),n2(uv*3.+u_seed))*fr*.10;',
// limb darkening + AA edge
' col*=1.-pow(r,5.)*.55;',
' float aa=smoothstep(1.0,0.985,r);',
' gl_FragColor=vec4(col,aa);',
'}'].join('\n');
  function hex3(hx){var v=parseInt(hx.slice(1),16);return [(v>>16&255)/255,(v>>8&255)/255,(v&255)/255];}
  window.OrbShader={
    supported:function(){try{var c=document.createElement('canvas');return !!(c.getContext('webgl')||c.getContext('experimental-webgl'));}catch(e){return false;}},
    create:function(canvas,hexes,seed){
      var gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
      if(!gl)return null;
      function mk(t,s){var sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);
        if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){try{console.warn('OrbShader:',gl.getShaderInfoLog(sh));}catch(e){}return null;}return sh;}
      var vs=mk(gl.VERTEX_SHADER,VS),fs=mk(gl.FRAGMENT_SHADER,FS); if(!vs||!fs)return null;
      var pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
      if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return null;
      gl.useProgram(pr);
      var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      var loc=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      var U={};['u_res','u_t','u_seed','u_li','u_str','u_m','u_d','u_l','u_c0','u_c1','u_c2','u_c3','u_c4'].forEach(function(k){U[k]=gl.getUniformLocation(pr,k);});
      var cols=hexes.slice(0,5).map(hex3); while(cols.length<5)cols.push(cols[cols.length-1]||[.5,.5,.5]);
      gl.uniform1f(U.u_seed,seed);
      for(var i=0;i<5;i++)gl.uniform3fv(U['u_c'+i],cols[i]);
      return {
        gl:gl,
        render:function(t,l,li,str,m,d){
          gl.viewport(0,0,canvas.width,canvas.height);
          gl.uniform2f(U.u_res,canvas.width,canvas.height);
          gl.uniform1f(U.u_t,t);gl.uniform2f(U.u_l,l[0],l[1]);
          gl.uniform1f(U.u_li,li);gl.uniform1f(U.u_str,str);gl.uniform1f(U.u_m,m===undefined?0.5:m);gl.uniform1f(U.u_d,d===undefined?1.:d);
          gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLES,0,3);
        },
        lose:function(){try{var e=gl.getExtension('WEBGL_lose_context');if(e)e.loseContext();}catch(err){}}
      };
    }
  };
})();
