// Vela mood O: "Embossed rings, lit". Fragment shader (WebGL 2 / GLSL ES 3.00), written for Vela, MIT.
// Hash without sine after Dave Hoskins (MIT). Reference implementation from the comparison page,
// https://claude.ai/artifact/28GaPKHA1k4gCVgLxarTg4. The Figma version is a WGSL port (custom shader fill
// 21291e26-ee56-4db6-b984-70df934e153d, version 7b7cf08c).
// Uniforms: uRes (px), uT (s; 0 or a fixed value when still), uBase/uDeep/uLine/uAlt (surface palette, from Vela primitives),
// uLight (1 on the light playground), uQuiet (unused here), uSeal (1, or 1.4 on the Community thumbnail),
// uStyle (1 = embossed), uLit (1 = stage light and vignette), uSealC (corner offset; default .12, .98).
// Palettes: cover  base #0a6c7d deep #075462 line #2f9db3 alt #35558a
//           light  base #f7f9f9 deep #eef2f2 line #0a6c7d alt #dde3e4
//           dark   base #1b2225 deep #11171a line #187e91 alt #262e31
// Release seed: 0.15.0 -> 15 lobes, 0.15 twist. Measured worst text contrast: cover 5.90:1, light 13.73:1, dark 13.38:1.
#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec3 uBase, uDeep, uLine, uAlt; uniform float uLight, uQuiet, uSeal, uStyle, uLit; uniform vec2 uSealC;
out vec4 o;
// Hash without sine, after Dave Hoskins (MIT).
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031,.1030,.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy) * 2. - 1.; }
float gnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(dot(hash22(i), f), dot(hash22(i+vec2(1,0)), f-vec2(1,0)), u.x),
             mix(dot(hash22(i+vec2(0,1)), f-vec2(0,1)), dot(hash22(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int k = 0; k < 4; k++){ s += a*gnoise(p); p = p*2.03 + 17.1; a *= .5; } return s; }
vec2 dp(){ return gl_FragCoord.xy * (1080. / uRes.y); }            // design pixels, 1080 tall
vec2 uvd(){ vec2 d = dp(); return vec2(d.x, 1080. - d.y) / 1080.; } // 0..1 tall, y down
vec3 baseCol(vec2 uv){ float g = smoothstep(-.1, 1.3, uv.x*.30 + uv.y*.70); return mix(uBase, uDeep, g*.75); }
float quiet(vec2 uv){ // the text column: x < 0.95 of height, y between 0.3 and 0.75
  float qx = 1. - smoothstep(.70, 1.05, uv.x); float qy = smoothstep(.26, .34, uv.y) * (1. - smoothstep(.70, .78, uv.y));
  return 1. - uQuiet * .7 * qx * qy; }

void main(){ vec2 uv = uvd(); vec3 c = baseCol(uv); float A = uRes.x / uRes.y;
    if (uLit > .5) { vec2 lp = vec2(A*.70, .40); float l = exp(-dot(uv-lp, uv-lp)*2.0); c = mix(c, uLine, (uLight > .5 ? .05 : .16)*l);
      float vg = smoothstep(.55, 1.30, length((uv - vec2(A*.5, .5)) / vec2(A*.5, .5))); c = mix(c, uDeep*(uLight > .5 ? .97 : .80), (uLight > .5 ? .5 : .55)*vg); }
    c += (hash12(floor(gl_FragCoord.xy)) - .5) * (uLight > .5 ? .018 : .03);
    float k = uSeal; vec2 ctr = vec2(A - uSealC.x, uSealC.y); vec2 q = (uv - ctr) / k; float r = length(q); float th = atan(q.y, q.x);
    float drift = uT * .004; float lines = 0., h = 0.; float wpx = fwidth(r);
    bool thumb = uSeal > 1.2; float stp = thumb ? .044 : .026; float wid = thumb ? 3.4 : 1.2; int n = thumb ? 7 : 12;
    for (int i = 0; i < 12; i++) { if (i >= n) break; float fi = float(i);
      float ph = 15.*th + fi*.15*6.2832 + drift;
      float ri = .16 + fi*stp + .010*sin(ph) + .006*sin(4.*th - fi*.7); float dd = abs(r - ri);
      float wm = uStyle == 2. ? wid*(.45 + 1.25*(.5 + .5*sin(ph))) : wid;
      lines = max(lines, 1. - smoothstep(0., wpx*wm, dd));
      h = max(h, exp(-pow(dd / (wpx*(uStyle == 3. ? 9. : 2.4)), 2.))); }
    float fade = 1. - smoothstep(.30, .50, r);
    if (uStyle == 1.) { float e = clamp((dFdx(h)*-1. + dFdy(h)*1.) * 1.6, -1., 1.);
      c = mix(c, uLight > .5 ? vec3(1.) : mix(uBase, vec3(1.), .55), clamp(e, 0., 1.) * fade * .55);
      c = mix(c, uLight > .5 ? uAlt*.9 : uDeep*.55, clamp(-e, 0., 1.) * fade * .55); }
    else if (uStyle == 3.) { c = mix(c, uLight > .5 ? vec3(1.) : uLine, h * fade * (uLight > .5 ? .7 : .14)); }
    else { c = mix(c, uLine, lines * fade * (uLight > .5 ? .22 : (thumb ? .46 : .32))); }
    o = vec4(c, 1.); }
