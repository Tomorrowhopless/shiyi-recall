import { createCard } from './core.js';

export const MATH_CONTENT_VERSION = 1;
export const MATH_COURSES = {
  calculus: { name: '高数', description: '极限、微分与积分', symbol: '∫' },
  probability: { name: '概率论', description: '概率、分布与数字特征', symbol: 'P' },
  'linear-algebra': { name: '线性代数', description: '矩阵、方程组与特征值', symbol: 'A' },
};
export const MATH_CONTENT_TYPES = { formula: '公式', problem: '题型' };
export const MATH_SOURCES = [
  { title: 'OpenStax · 积分表', url: 'https://openstax.org/books/calculus-volume-2/pages/a-table-of-integrals' },
  { title: 'OpenStax · 泰勒与麦克劳林展开', url: 'https://openstax.org/books/calculus-volume-2/pages/6-3-taylor-and-maclaurin-series' },
  { title: 'Penn State · 概率论课程', url: 'https://online.stat.psu.edu/stat414/' },
  { title: 'MIT OpenCourseWare · 线性代数', url: 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-videos/' },
];
const rows = [];
const add = (course,type,id,front,back,notes,tags=[]) => rows.push({course,type,id,front,back,notes,tags});
const f = (course,id,front,back,notes,tags) => add(course,'formula',id,front,back,notes,tags);
const p = (course,id,front,back,notes,tags) => add(course,'problem',id,front,back,notes,tags);
const C='calculus', P='probability', L='linear-algebra';

// The photographed revision sheet: six expansions and twenty basic integrals.
f(C,'taylor-tan','请写出 $\\tan x$ 在 $x=0$ 附近的展开，保留到五次项。',String.raw`$$\tan x=x+\frac{x^3}{3}+\frac{2x^5}{15}+O(x^7).$$`,'当 x→0；完整麦克劳林级数的收敛半径为 π/2。照片中的泰勒展开。',['泰勒展开','照片整理']);
f(C,'taylor-sin','请写出 $\\sin x$ 在 $x=0$ 附近的展开，保留到五次项。',String.raw`$$\sin x=x-\frac{x^3}{3!}+\frac{x^5}{5!}+O(x^7).$$`,'当 x→0，x 用弧度。完整级数对所有实数 x 收敛。',['泰勒展开','照片整理']);
f(C,'taylor-cos','请写出 $\\cos x$ 在 $x=0$ 附近的展开，保留到四次项。',String.raw`$$\cos x=1-\frac{x^2}{2!}+\frac{x^4}{4!}+O(x^6).$$`,'当 x→0，x 用弧度。偶函数只出现偶次项。',['泰勒展开','照片整理']);
f(C,'taylor-reciprocal','请写出 $1/(1+x)$ 在 $x=0$ 附近的展开。',String.raw`$$\frac1{1+x}=\sum_{n=0}^{\infty}(-1)^n x^n=1-x+x^2-x^3+\cdots,\quad |x|<1.$$`,'照片中写成 t 时只需把 x 换成 t。注意正负号交替，端点不在此收敛区间内。',['泰勒展开','照片整理']);
f(C,'taylor-power','请写出 $(1+x)^\\alpha$ 在 $x=0$ 附近的展开，保留到三次项。',String.raw`$$(1+x)^\alpha=1+\alpha x+\frac{\alpha(\alpha-1)}2x^2+\frac{\alpha(\alpha-1)(\alpha-2)}6x^3+O(x^4).$$`,'α 为固定实数，x→0，取 1+x>0。广义二项式级数在 |x|<1 成立；α 为非负整数时展开终止。',['泰勒展开','照片整理']);
f(C,'taylor-log','请写出 $\\ln(1+x)$ 在 $x=0$ 附近的展开。',String.raw`$$\ln(1+x)=\sum_{n=1}^{\infty}\frac{(-1)^{n+1}x^n}{n}=x-\frac{x^2}{2}+\frac{x^3}{3}-\cdots.$$`,'级数在 -1<x≤1 收敛到 ln(1+x)。求局部极限时使用 x→0 的有限阶展开即可。',['泰勒展开','照片整理']);
f(C,'taylor-exp','请写出 $e^x$ 在 $x=0$ 附近的展开。',String.raw`$$e^x=\sum_{n=0}^{\infty}\frac{x^n}{n!}=1+x+\frac{x^2}{2!}+\frac{x^3}{3!}+\cdots.$$`,'对所有实数 x 收敛。与三角函数不同，每一阶都有项。',['泰勒展开']);
f(C,'int-power','幂函数 $\\int x^\\mu\\,dx$ 的积分公式是什么？',String.raw`$$\int x^\mu\,dx=\frac{x^{\mu+1}}{\mu+1}+C,\quad\mu\ne-1.$$`,'一般实数 μ 可先取 x>0；μ=-1 时应另用 ln|x|+C。原函数定义在被积函数有意义的区间上。',['基本积分','照片整理']);
f(C,'int-root-recip','请写出 $\\int \\frac{dx}{\\sqrt{x}}$。',String.raw`$$\int\frac{dx}{\sqrt{x}}=2\sqrt{x}+C.$$`,'实数范围 x>0。把被积函数写成 x 的 -1/2 次方。',['基本积分','照片整理']);
f(C,'int-exp-base','请写出 $\\int a^x\\,dx$。',String.raw`$$\int a^x\,dx=\frac{a^x}{\ln a}+C,\quad a>0,\ a\ne1.$$`,'若 a=1，被积函数恒为 1，积分为 x+C。不要漏掉分母 ln a。',['基本积分','照片整理']);
f(C,'int-tan','请写出 $\\int \\tan x\\,dx$。',String.raw`$$\int\tan x\,dx=-\ln|\cos x|+C.$$`,'在 cos x≠0 的连续区间内使用。把 tan x 写成 sin x/cos x。',['三角积分','照片整理']);
f(C,'int-cot','请写出 $\\int \\cot x\\,dx$。',String.raw`$$\int\cot x\,dx=\ln|\sin x|+C.$$`,'在 sin x≠0 的连续区间内使用。与 tan x 的积分比较记忆符号。',['三角积分','照片整理']);
f(C,'int-sec2','请写出 $\\int \\sec^2x\\,dx$。',String.raw`$$\int\sec^2x\,dx=\tan x+C.$$`,'cos x≠0。直接对应 tan x 的导数。',['三角积分','照片整理']);
f(C,'int-csc2','请写出 $\\int \\csc^2x\\,dx$。',String.raw`$$\int\csc^2x\,dx=-\cot x+C.$$`,'sin x≠0。cot x 的导数带负号。',['三角积分','照片整理']);
f(C,'int-sec','请写出 $\\int \\sec x\\,dx$。',String.raw`$$\int\sec x\,dx=\ln|\sec x+\tan x|+C.$$`,'cos x≠0，在相应连续区间上使用。可把分子分母同乘 sec x+tan x 来凑微分。',['三角积分','照片整理']);
f(C,'int-csc','请写出 $\\int \\csc x\\,dx$。',String.raw`$$\int\csc x\,dx=\ln|\csc x-\cot x|+C.$$`,'sin x≠0。等价形式为 -ln|csc x+cot x|+C。',['三角积分','照片整理']);
f(C,'int-arcsin','请写出 $\\int\\frac{dx}{\\sqrt{a^2-x^2}}$。',String.raw`$$\int\frac{dx}{\sqrt{a^2-x^2}}=\arcsin\frac{x}{a}+C,\quad a>0.$$`,'实数被积函数要求 |x|<a。注意 a>0 的约定。',['反三角积分','照片整理']);
f(C,'int-arctan','请写出 $\\int\\frac{dx}{a^2+x^2}$。',String.raw`$$\int\frac{dx}{a^2+x^2}=\frac1a\arctan\frac{x}{a}+C,\quad a>0.$$`,'x 可为任意实数。外面的 1/a 不能遗漏。',['反三角积分','照片整理']);
f(C,'int-root-plus-recip','请写出 $\\int\\frac{dx}{\\sqrt{x^2+a^2}}$。',String.raw`$$\int\frac{dx}{\sqrt{x^2+a^2}}=\ln\left|x+\sqrt{x^2+a^2}\right|+C,\quad a>0.$$`,'x 可为任意实数。照片右侧的对数形式；注意根号覆盖 x²+a²。',['根式积分','照片整理']);
f(C,'int-logistic','请写出 $\\int\\frac{dx}{1+e^x}$。',String.raw`$$\int\frac{dx}{1+e^x}=x-\ln(1+e^x)+C.$$`,'x 为实数。可写成 1−e^x/(1+e^x) 后积分。',['基本积分','照片整理']);
f(C,'int-a2-minus-x2','请写出 $\\int\\frac{dx}{a^2-x^2}$。',String.raw`$$\int\frac{dx}{a^2-x^2}=\frac1{2a}\ln\left|\frac{a+x}{a-x}\right|+C,\quad a>0.$$`,'x≠±a，在不穿过这两个点的区间内使用。可先作部分分式分解。',['有理函数积分','照片整理']);
f(C,'int-root-plus','请写出 $\\int\\sqrt{x^2+a^2}\\,dx$。',String.raw`$$\int\sqrt{x^2+a^2}\,dx=\frac12\left[x\sqrt{x^2+a^2}+a^2\ln\left|x+\sqrt{x^2+a^2}\right|\right]+C.$$`,'a>0，x 为实数。根号内是“加”，对数项前也是“加”。',['根式积分','照片整理']);
f(C,'int-root-minus','请写出 $\\int\\sqrt{x^2-a^2}\\,dx$。',String.raw`$$\int\sqrt{x^2-a^2}\,dx=\frac12\left[x\sqrt{x^2-a^2}-a^2\ln\left|x+\sqrt{x^2-a^2}\right|\right]+C.$$`,'a>0，在 |x|>a 的区间使用；端点可取连续延拓。根号内是“减”，对数项前也是“减”。',['根式积分','照片整理']);
f(C,'int-root-circle','请写出 $\\int\\sqrt{a^2-x^2}\\,dx$。',String.raw`$$\int\sqrt{a^2-x^2}\,dx=\frac12\left[x\sqrt{a^2-x^2}+a^2\arcsin\frac{x}{a}\right]+C.$$`,'a>0，在 |x|<a 求导验证，端点可连续延拓。可用 x=a sin t 换元。',['根式积分','照片整理']);
f(C,'int-sec3','请写出 $\\int\\sec^3x\\,dx$。',String.raw`$$\int\sec^3x\,dx=\frac12\sec x\tan x+\frac12\ln|\sec x+\tan x|+C.$$`,'cos x≠0。分部积分后，原积分会同时出现在等式两边，需要移项。',['三角积分','照片整理']);
f(C,'int-x2-minus-a2','请写出 $\\int\\frac{dx}{x^2-a^2}$。',String.raw`$$\int\frac{dx}{x^2-a^2}=\frac1{2a}\ln\left|\frac{x-a}{x+a}\right|+C,\quad a>0.$$`,'x≠±a。与分母 a²−x² 的积分比较，整体差一个负号。',['有理函数积分','照片整理']);
f(C,'int-log','请写出 $\\int\\frac{dx}{x}$。',String.raw`$$\int\frac{dx}{x}=\ln|x|+C.$$`,'x≠0，分别在正、负半轴上理解原函数。',['基本积分']);
f(C,'parts','分部积分公式是什么？',String.raw`$$\int u\,dv=uv-\int v\,du.$$`,'u、v 在所考虑区间可微且相关积分存在。选取 u 与 dv 的目标是让剩下的积分更简单。',['积分方法']);
p(C,'limit-taylor','题型：相消后的极限。如何求 $\\lim_{x\\to0}\\frac{\\sin x-x}{x^3}$？',String.raw`$$\sin x=x-\frac{x^3}{6}+o(x^3),\qquad\lim_{x\to0}\frac{\sin x-x}{x^3}=-\frac16.$$`,'识别：低阶项相消，分母要求三阶精度。方法：展开到第一个未相消项。不要用 sin x∼x 直接相减。',['极限','泰勒展开']);
p(C,'limit-equivalent','题型：乘除型无穷小。如何求 $\\lim_{x\\to0}\\frac{\\ln(1+2x)}{\\sin3x}$？',String.raw`$$\ln(1+2x)\sim2x,\quad\sin3x\sim3x,\quad\text{极限}=\frac23.$$`,'识别：分子分母分别趋于 0，主要是乘除结构。方法：在 x→0 下换成等价无穷小；加减相消时必须保留更高阶项。',['极限','等价无穷小']);
p(C,'derivative-log','题型：幂指函数求导。如何求 $y=x^x$ 的导数？',String.raw`$$\ln y=x\ln x,\qquad\frac{y'}y=\ln x+1,\qquad y'=x^x(\ln x+1).$$`,'条件 x>0。识别：底数和指数都含自变量；先取对数，再隐式求导。',['导数','对数求导']);
p(C,'extrema','题型：闭区间最值。如何求 $f(x)=x^3-3x$ 在 $[-2,2]$ 上的最值？',String.raw`$$f'(x)=3(x^2-1),\quad x=\pm1.$$`+'\n计算端点和驻点：f(−2)=−2，f(−1)=2，f(1)=−2，f(2)=2。故最大值为 2，最小值为 −2。','识别：连续函数在闭区间求最值。方法：列出驻点、不可导的内点和端点，统一代入比较，不能只比较驻点。',['最值','导数应用']);
p(C,'substitution','题型：凑微分。如何求 $\\int\\frac{2x}{1+x^2}\\,dx$？',String.raw`$$t=1+x^2,\quad dt=2x\,dx,\qquad\int\frac{2x}{1+x^2}\,dx=\ln(1+x^2)+C.$$`,'识别：分子是分母的导数。方法：设分母或复合函数的内层为新变量。这里 1+x²>0，无需对数绝对值。',['积分','换元法']);
p(C,'parts-example','题型：多项式乘指数。如何求 $\\int xe^x\\,dx$？',String.raw`$$u=x,\ dv=e^x dx\quad\Longrightarrow\quad\int xe^x dx=xe^x-\int e^x dx=(x-1)e^x+C.$$`,'识别：一部分求导会降次，另一部分容易积分。方法：把多项式选为 u，必要时重复分部积分。',['积分','分部积分']);
p(C,'partial-fractions','题型：可分解分母的有理函数。如何求 $\\int\\frac{dx}{x(x+1)}$？',String.raw`$$\frac1{x(x+1)}=\frac1x-\frac1{x+1},\qquad\int\frac{dx}{x(x+1)}=\ln\left|\frac{x}{x+1}\right|+C.$$`,'条件 x≠0,−1。方法：先做多项式除法（若需），再按实因式分解列部分分式；重因子每一幂都要列出。',['积分','部分分式']);
p(C,'symmetry','题型：对称区间定积分。如何求 $\\int_{-1}^1(x^3+x^2)\\,dx$？',String.raw`$$\int_{-1}^1x^3dx=0,\qquad\int_{-1}^1x^2dx=2\int_0^1x^2dx=\frac23.$$`,'识别：区间关于 0 对称。方法：分出奇、偶部分；奇函数积分为 0，偶函数积分为右半区间的 2 倍。要求可积。',['定积分','奇偶性']);
p(C,'trig-substitution','题型：圆根式积分。如何求 $\\int_0^a\\sqrt{a^2-x^2}\\,dx$？',String.raw`$$x=a\sin t,\quad t\in[0,\pi/2],\qquad\int_0^a\sqrt{a^2-x^2}\,dx=a^2\int_0^{\pi/2}\cos^2t\,dt=\frac{\pi a^2}{4}.$$`,'a>0。识别：a²−x² 的平方根。也可直接识别为半径 a 的四分之一圆面积；换元时同步换上下限。',['积分','三角换元']);
p(C,'linear-ode','题型：一阶线性微分方程。如何解 $y^{\\prime}+y=e^x$？',String.raw`$$(e^xy)'=e^{2x},\qquad e^xy=\frac12e^{2x}+C,\qquad y=\frac12e^x+Ce^{-x}.$$`,'识别标准式 y′+p(x)y=q(x)。乘积分因子 exp(∫p dx)，把左边凑成乘积的导数。',['微分方程']);

f(P,'conditional','条件概率与乘法公式是什么？',String.raw`$$P(A\mid B)=\frac{P(A\cap B)}{P(B)},\quad P(A\cap B)=P(B)P(A\mid B).$$`,'要求 P(B)>0。条件事件 B 改变了概率计算的样本空间。',['事件概率']);
f(P,'total','全概率公式是什么？',String.raw`$$P(A)=\sum_i P(B_i)P(A\mid B_i).$$`,'B_i 构成有限或可数的完备事件组：两两互斥、并为全集，且有关条件概率要求 P(B_i)>0。',['全概率']);
f(P,'bayes','贝叶斯公式是什么？',String.raw`$$P(B_j\mid A)=\frac{P(B_j)P(A\mid B_j)}{\sum_iP(B_i)P(A\mid B_i)}.$$`,'B_i 为完备事件组，分母 P(A)>0。先验乘似然再除以证据概率；不要把 P(A|B) 与 P(B|A) 混同。',['贝叶斯']);
f(P,'union','两个事件并集的概率公式是什么？',String.raw`$$P(A\cup B)=P(A)+P(B)-P(A\cap B).$$`,'只有互斥时，交集概率才为 0。相互独立通常不等于互斥。',['事件概率']);
f(P,'independence','两个事件相互独立的判定公式是什么？',String.raw`$$P(A\cap B)=P(A)P(B).$$`,'当条件概率有定义时，可写成 P(A|B)=P(A)。多个事件的两两独立不自动推出相互独立。',['独立性']);
f(P,'binomial','二项分布的概率、期望和方差是什么？',String.raw`$$X\sim B(n,p):\quad P(X=k)=\binom nk p^k(1-p)^{n-k},\quad k=0,\ldots,n.$$
$$E(X)=np,\qquad D(X)=np(1-p).$$`,'n 为非负整数，0≤p≤1。对应 n 次相互独立、成功概率相同的伯努利试验。',['常见分布']);
f(P,'poisson','泊松分布的概率、期望和方差是什么？',String.raw`$$X\sim P(\lambda):\quad P(X=k)=e^{-\lambda}\frac{\lambda^k}{k!},\quad k=0,1,\ldots.$$
$$E(X)=D(X)=\lambda.$$`,'λ>0。适合描述满足相应稀有独立发生假设下的计数；不是所有计数都服从泊松分布。',['常见分布']);
f(P,'uniform','均匀分布 $U(a,b)$ 的密度、期望与方差是什么？',String.raw`$$f(x)=\begin{cases}\frac1{b-a},&a<x<b,\\0,&\text{其他},\end{cases}\qquad E(X)=\frac{a+b}{2},\quad D(X)=\frac{(b-a)^2}{12}.$$`,'要求 a<b。连续型随机变量在单个点的概率为 0，密度的端点取值不影响分布。',['常见分布']);
f(P,'exponential','指数分布的密度、期望与方差是什么？',String.raw`$$f(x)=\begin{cases}\lambda e^{-\lambda x},&x\ge0,\\0,&x<0,\end{cases}\qquad E(X)=\frac1\lambda,\quad D(X)=\frac1{\lambda^2}.$$`,'这里 λ>0 是“率”参数，不是均值或尺度参数。尾概率 P(X>t)=e^(−λt)，t≥0。',['常见分布']);
f(P,'normal','正态分布如何标准化？',String.raw`$$X\sim N(\mu,\sigma^2),\quad Z=\frac{X-\mu}{\sigma}\sim N(0,1).$$
$$P(a<X\le b)=\Phi\left(\frac{b-\mu}{\sigma}\right)-\Phi\left(\frac{a-\mu}{\sigma}\right).$$`,'σ>0 是标准差；N(μ,σ²) 的第二个参数是方差。Φ 为标准正态分布函数。',['常见分布']);
f(P,'expectation','离散型与连续型随机变量的函数期望如何计算？',String.raw`$$E[g(X)]=\sum_k g(x_k)p_k\quad\text{或}\quad E[g(X)]=\int_{-\infty}^{\infty}g(x)f_X(x)\,dx.$$`,'要求相应绝对可积条件（有限期望时）。不必先求 g(X) 的分布。',['数字特征']);
f(P,'variance','方差与线性变换的公式是什么？',String.raw`$$D(X)=E(X^2)-[E(X)]^2,\qquad E(aX+b)=aE(X)+b,\qquad D(aX+b)=a^2D(X).$$`,'方差公式要求二阶矩有限。平移不改变方差，倍乘使方差乘以倍数的平方。',['数字特征']);
f(P,'covariance','协方差、相关系数与和的方差是什么？',String.raw`$$\operatorname{Cov}(X,Y)=E(XY)-E(X)E(Y).$$
$$\rho_{XY}=\frac{\operatorname{Cov}(X,Y)}{\sqrt{D(X)D(Y)}},\quad D(X+Y)=D(X)+D(Y)+2\operatorname{Cov}(X,Y).$$`,'假设二阶矩有限；相关系数还要求两个方差均大于 0。独立推出不相关，反过来一般不成立。',['数字特征']);
f(P,'cdf-density','连续型随机变量的分布函数与密度有什么关系？',String.raw`$$F_X(x)=\int_{-\infty}^x f_X(t)\,dt,\quad f_X(x)\ge0,\quad\int_{-\infty}^{\infty}f_X(x)\,dx=1.$$`,'在 F 可导的适当点有 f=F′；密度仅需几乎处处定义，分布函数本身始终右连续。',['分布函数']);
p(P,'type-bayes','题型：已知检测阳性，反求患病概率。患病率 1%，灵敏度 90%，假阳性率 5%，答案是多少？',String.raw`$$P(\text{患病}\mid +)=\frac{0.01\times0.90}{0.01\times0.90+0.99\times0.05}=\frac2{13}\approx15.38\%.$$`,'识别：题目把条件方向反转。方法：以患病/未患病划分来源，用全概率求阳性率，再用贝叶斯。这里是纯数学假设例题。',['贝叶斯','条件反转']);
p(P,'type-binomial','题型：独立重复试验。抛 5 次公平硬币，恰有 2 次正面的概率是多少？',String.raw`$$X\sim B(5,1/2),\qquad P(X=2)=\binom52\left(\frac12\right)^5=\frac5{16}.$$`,'识别：次数固定、试验独立、成功概率不变。方法：先定义成功次数 X，再辨认“恰好、至少、至多”。',['二项分布']);
p(P,'type-complement','题型：“至少一次”。独立进行 3 次成功率 0.2 的试验，至少成功一次的概率是多少？',String.raw`$$P(X\ge1)=1-P(X=0)=1-0.8^3=0.488.$$`,'识别：直接分类较多，而反事件只有“全部失败”。乘积 0.8³ 依赖三次试验独立。',['反事件']);
p(P,'type-density','题型：确定密度参数并求概率。若 $f(x)=cx$（$0<x<2$），其余为 0，求 $c$ 与 $P(X>1)$。',String.raw`$$1=\int_0^2cx\,dx=2c\Rightarrow c=\frac12,\qquad P(X>1)=\int_1^2\frac{x}{2}\,dx=\frac34.$$`,'识别：密度含未知常数。方法：先非负性与归一化，再在所求区间积分。密度值不等于点概率。',['概率密度']);
p(P,'type-normal','题型：正态概率。若 $X\\sim N(10,4)$，如何求 $P(8<X<12)$？',String.raw`$$\sigma=2,\quad P(8<X<12)=P(-1<Z<1)=\Phi(1)-\Phi(-1)\approx0.6827.$$`,'先把第二个参数 4 开方，得到标准差 2，再标准化。这里 0.6827 为标准正态概率的近似值。',['正态分布']);
p(P,'type-expectation','题型：不先求变换分布。已知 $E(X)=2,D(X)=3$，求 $E[(X+1)^2]$。',String.raw`$$E(X^2)=D(X)+[E(X)]^2=7,\qquad E[(X+1)^2]=7+2\times2+1=12.$$`,'识别：只求函数期望或二阶多项式的期望。方法：先展开，利用期望线性性；不能把 E(X²) 写成 [E(X)]²。',['期望','方差']);

f(L,'matrix-transpose','矩阵乘积与转置、逆矩阵有什么关系？',String.raw`$$(AB)^T=B^TA^T,\qquad(AB)^{-1}=B^{-1}A^{-1}.$$`,'转置公式要求乘积有意义；逆矩阵公式要求 A、B 为同阶可逆方阵。注意两式都倒转顺序。',['矩阵运算']);
f(L,'inverse-2','二阶矩阵的逆矩阵公式是什么？',String.raw`$$A=\begin{pmatrix}a&b\\c&d\end{pmatrix},\quad A^{-1}=\frac1{ad-bc}\begin{pmatrix}d&-b\\-c&a\end{pmatrix}.$$`,'条件 ad−bc≠0。主对角元素互换，副对角元素变号，再除以行列式。',['逆矩阵']);
f(L,'det-properties','行列式的乘积、转置和数乘公式是什么？',String.raw`$$\det(AB)=\det A\det B,\quad\det(A^T)=\det A,\quad\det(cA)=c^n\det A.$$`,'A、B 为 n 阶方阵；数乘矩阵的每一行都乘 c，因此出现 c 的 n 次方。',['行列式']);
f(L,'det-row','初等行变换怎样影响行列式？',String.raw`$$R_i\leftrightarrow R_j:\ \det\mapsto-\det;\qquad R_i\mapsto cR_i:\ \det\mapsto c\det.$$`+'\n把一行的 k 倍加到另一行，行列式不变。','倍加变换要求是两条不同的行。行列式计算时要记录交换次数与提出的因子。',['行列式']);
f(L,'rank-nullity','秩与零空间维数之间有什么关系？',String.raw`$$A\in\mathbb R^{m\times n}:\qquad\dim\ker A=n-\operatorname{rank}A.$$`,'n 是未知量或列的数量。齐次方程组 Ax=0 的基础解系含 n−r 个向量。',['秩','方程组']);
f(L,'system-consistency','线性方程组 $Ax=b$ 何时有解、唯一解或无穷多解？',String.raw`$$\operatorname{rank}A=\operatorname{rank}(A\mid b)\iff\text{有解}.$$`+'\n若共同的秩等于未知量数 n，则唯一解；若共同的秩小于 n，则有无穷多解。','实数或复数域上讨论。秩不相等时无解；增广矩阵必须包含右端列 b。',['方程组']);
f(L,'general-solution','非齐次线性方程组的通解结构是什么？',String.raw`$$x=x_p+c_1\xi_1+\cdots+c_{n-r}\xi_{n-r}.$$`,'要求方程组相容；x_p 是一个特解，ξ_i 是对应齐次组 Ax=0 的基础解系。两个特解之差是齐次解。',['方程组']);
f(L,'eigen-definition','特征值与特征向量的定义及求法是什么？',String.raw`$$Av=\lambda v,\quad v\ne0;\qquad\det(\lambda I-A)=0,\quad(A-\lambda I)v=0.$$`,'A 为方阵。零向量绝不是特征向量；求每个特征值后仍要解对应齐次组。',['特征值']);
f(L,'trace-det-eigen','特征值与迹、行列式有什么关系？',String.raw`$$\sum_{i=1}^n\lambda_i=\operatorname{tr}A,\qquad\prod_{i=1}^n\lambda_i=\det A.$$`,'特征值按代数重数计数，必要时在复数域考虑。矩阵不必可对角化。',['特征值']);
f(L,'diagonalization','矩阵可对角化的条件是什么？',String.raw`$$P^{-1}AP=D\iff A\text{ 有 }n\text{ 个线性无关的特征向量}.$$`,'A 为 n 阶方阵，P 由这些特征向量作为列组成，D 的对应位置放特征值；在指定的数域上讨论。n 个不同特征值是充分而非必要条件。',['对角化']);
f(L,'quadratic-positive','实对称矩阵正定有哪些常用判定？',String.raw`$$A\succ0\iff x^TAx>0\ (x\ne0)\iff\lambda_i>0\ (\forall i).$$`+'\nSylvester 判据：所有顺序主子式均为正，也等价于正定。','A 必须为实对称矩阵。不要把“所有顺序主子式非负”直接当作半正定判据。',['二次型']);
f(L,'orthogonal-projection','向非零向量 $u$ 所张成直线的正交投影公式是什么？',String.raw`$$\operatorname{proj}_u v=\frac{u^Tv}{u^Tu}\,u.$$`,'实数内积空间，u≠0。残差 v−proj_u v 与 u 正交。',['向量','正交']);
p(L,'type-elimination','题型：消元解方程组。如何解 $x+y=3,\\ x-y=1$？',String.raw`$$\left(\begin{array}{cc|c}1&1&3\\1&-1&1\end{array}\right)\longrightarrow\left(\begin{array}{cc|c}1&1&3\\0&-2&-2\end{array}\right).$$`+'\n由第二行 y=1，代回第一行得 x=2。','识别：要求解或判断解的情况。方法：对增广矩阵做初等行变换，检查矛盾行与自由未知量。',['高斯消元']);
p(L,'type-parameter','题型：含参方程组。$x+y=1,\\ x+ay=b$ 的解怎样分类？',String.raw`$$R_2\leftarrow R_2-R_1\Rightarrow(a-1)y=b-1.$$`+'\na≠1 时唯一解：y=(b−1)/(a−1)，x=1−y。\na=1,b=1 时无穷多解；a=1,b≠1 时无解。','识别：消元会出现可能为 0 的参数。方法：先分情形，再除以参数；不要直接除以 a−1。',['方程组','参数讨论']);
p(L,'type-det',String.raw`题型：用行变换求行列式。求 $\det\begin{pmatrix}1&2&3\\2&5&7\\1&0&1\end{pmatrix}$。`,String.raw`$$R_2\leftarrow R_2-2R_1,\quad R_3\leftarrow R_3-R_1\Rightarrow\begin{vmatrix}1&2&3\\0&1&1\\0&-2&-2\end{vmatrix}=0.$$`,'识别：一列方便消元，变换后出现相关行。方法：优先倍加变换；得到零行或成比例行即可判断行列式为 0。',['行列式']);
p(L,'type-basis',String.raw`题型：求齐次组基础解系。若 $A=\begin{pmatrix}1&2&3\\0&1&1\end{pmatrix}$，求 $Ax=0$。`,String.raw`$$x_3=t,\quad x_2=-t,\quad x_1=-t,\qquad x=t\begin{pmatrix}-1\\-1\\1\end{pmatrix}.$$`,'rank A=2，未知量 3 个，基础解系应有 1 个向量。方法：消元后选自由未知量，逐个设为 1、其余自由量设为 0。',['基础解系']);
p(L,'type-diagonal',String.raw`题型：实对称矩阵对角化。如何对角化 $A=\begin{pmatrix}2&1\\1&2\end{pmatrix}$？`,String.raw`$$\lambda_1=3,\ v_1=\begin{pmatrix}1\\1\end{pmatrix};\qquad\lambda_2=1,\ v_2=\begin{pmatrix}1\\-1\end{pmatrix}.$$
$$Q=\frac1{\sqrt2}\begin{pmatrix}1&1\\1&-1\end{pmatrix},\qquad Q^TAQ=\operatorname{diag}(3,1).$$`,'方法：求特征值、求特征向量，再单位化。实对称矩阵可取正交特征向量；Q 的列顺序要与对角元素一致。',['对角化']);
p(L,'type-positive','题型：含参数二次型正定。$q=x^2+2axy+2y^2$ 何时正定？',String.raw`$$A=\begin{pmatrix}1&a\\a&2\end{pmatrix},\qquad\Delta_1=1>0,\quad\Delta_2=2-a^2>0.$$
$$-\sqrt2<a<\sqrt2.$$`,'先把交叉项系数除以 2 放在矩阵的对称位置，再用顺序主子式判据。端点行列式为 0，不是正定。',['二次型','参数讨论']);

export function mathCards(now = new Date()) {
  return rows.map(row => ({
    ...createCard({ subject:'math', mathCourse:row.course, contentType:row.type, kind:'basic', front:row.front, back:row.back, notes:row.notes, tags:[MATH_COURSES[row.course].name,MATH_CONTENT_TYPES[row.type],...row.tags] }, now),
    id:`math-v1-${row.course}-${row.id}`,
  }));
}
export const MATH_CARD_COUNT = rows.length;
