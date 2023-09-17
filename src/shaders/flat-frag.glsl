#version 300 es
precision highp float;

uniform vec3 u_cameraPos;
uniform vec2 u_Dimensions;
uniform float u_time;
uniform vec4 u_Color;

in vec2 fs_Pos;
out vec4 out_Col;


//https://www.shadertoy.com/view/lsf3RH
float snoise(vec3 uv, float res)
{
	const vec3 s = vec3(1e0, 1e2, 1e3);
	
	uv *= res;
	
	vec3 uv0 = floor(mod(uv, res))*s;
	vec3 uv1 = floor(mod(uv+vec3(1.), res))*s;
	
	vec3 f = fract(uv); f = f*f*(3.0-2.0*f);

	vec4 v = vec4(uv0.x+uv0.y+uv0.z, uv1.x+uv0.y+uv0.z,
		      	  uv0.x+uv1.y+uv0.z, uv1.x+uv1.y+uv0.z);

	vec4 r = fract(sin(v*1e-1)*1e3);
	float r0 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);
	
	r = fract(sin((v + uv1.z - uv0.z)*1e-1)*1e3);
	float r1 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);
	
	return mix(r0, r1, f.z)*2.-1.;
}

float impulse(float k,float x){
	float h = k*x;
	return h*exp(1.f-h);
}

float parabola(float x, float k){
	return pow(4.*x*(1.-x),k);
}

float flame(in vec2 ndc_xy ) 
{
	vec2 p = ndc_xy;
	p.x *= u_Dimensions.x/u_Dimensions.y;
	
	float radius = length(p)*1.;

	//tool1
	radius = smoothstep(0.2,1.0,radius);

	float color  = 1.0 - 1.5*radius;

	vec3 coord = vec3(atan(p.x,p.y)/6.2832, radius*2., .0);
	vec3 shiftCoord = coord + vec3(0.,-u_time*0.5, 0.);
	float anotherSnoise = snoise(coord + shiftCoord,15.) + 1.;
	for(int i = 1; i <= 7; i++)
	{
		float power = pow(2.0, float(i));
		color += (0.75 / power) * snoise(shiftCoord, power*25.);
	}
	//tool2
	color = impulse(1.,color);
	return pow(max(color,0.),2.);
}


float glow(in vec2 ndc_xy){
	vec2 p = ndc_xy;
	//https://www.shadertoy.com/view/4dXGR4
	p.x *= (u_Dimensions.x/u_Dimensions.y);
	float radius = length(p)*.5;
	radius = clamp(radius+0.5,0.,1.);
	//tool3
	return floor(parabola(radius,0.6)*6.)/5.;
}

void main() {
	float jitter = length(u_cameraPos) * 0.2;//to make the flame fit the fireball
	vec3 color = u_Color.xyz * (flame(fs_Pos* jitter)*0.8 + glow(fs_Pos*jitter*1.2)*.4);
	out_Col = vec4(color,1.);
}