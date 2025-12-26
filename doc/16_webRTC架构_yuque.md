## WebRTC 整体架构
WebRTC 的技术架构分为多层，核心目标是实现端到端实时通信的标准化与高效性。根据搜索结果，其整体架构可归纳如下：  

#### 1. **接口层**
• **Web API**：面向 Web 开发者，提供 JavaScript 接口（如 `getUserMedia`、`RTCPeerConnection`），允许浏览器直接捕获音视频流并建立点对点连接。  
• **Native C++ API**：面向浏览器厂商或原生应用开发者，提供底层 C++ 接口，支持跨平台开发（如 iOS、Android）。  

#### 2. **会话层**
• **信令服务**：负责交换 SDP（会话描述协议）和 ICE（交互式连接建立）候选信息，用于协商媒体参数和穿透 NAT。WebRTC 未规定具体信令协议，需开发者自行实现（如 WebSocket、HTTP）。  
• **连接管理**：通过 `RTCPeerConnection` 管理端到端连接的建立、维护与释放。  

#### 3. **引擎层**
• **音频引擎**：包含编解码器（Opus、G.711）、3A 算法（回声消除、降噪、自动增益）及 NetEQ（网络抖动缓冲）。  
• **视频引擎**：支持 VP8、H.264 等编解码器，集成 Jitter Buffer（防抖动）和图像增强算法（如降噪）。  
• **传输模块**：基于 SRTP（安全实时传输协议）、DTLS（数据包传输层安全性协议）和 SCTP（流控制传输协议），保障媒体与数据的安全性及实时性。  

#### 4. **设备与网络层**
• **媒体采集与渲染**：通过硬件接口实现音视频捕获（摄像头、麦克风）和播放。  
• **NAT 穿透**：依赖 STUN/TURN 服务器获取公网 IP 或中继转发数据，确保 P2P 连接的可靠性。  

---

## 大型一对多/多对多场景的解决方案
WebRTC 默认基于 P2P 的 Mesh 架构，但在大规模实时通信场景下会面临带宽、计算资源瓶颈。以下是三种主流扩展方案及其适用场景：  

#### 1. **Mesh 架构（全互联）**
• **原理**：所有参与者两两建立 P2P 连接，形成网状拓扑。例如，3 人会议需 3 个发送端和 3 个接收端。  
• **优点**：无需中心服务器，延迟最低。  
• **缺点**：客户端上行带宽和计算压力大（需同时处理多路编解码），扩展性差（N 人会议需 N*(N-1) 个连接）。  
• **适用场景**：小规模（<5 人）、低延迟需求的场景（如小型团队会议）。  

#### 2. **MCU（多点控制单元）**
• **原理**：中心服务器接收所有参与者的音视频流，解码后混合成单一流再转发给各客户端。  
• **优点**：客户端负载轻（仅需处理 1 路流），支持异构设备（服务器可转码适配不同终端）。  
• **缺点**：服务器资源消耗高（编解码与混流计算密集）、延迟较高（需二次编解码）、成本昂贵。  
• **适用场景**：企业级硬件支持的高质量会议（如硬件 MCU 芯片）或需要统一媒体格式的场景。  

#### 3. **SFU（选择性转发单元）**
• **原理**：服务器仅转发原始媒体流，不进行编解码或混流。例如，A 发送的流由 SFU 直接转发给 B 和 C。  
• **优点**：服务器压力小（仅路由转发）、延迟低（无编解码开销）、扩展性强（支持大规模并发）。  
• **缺点**：客户端需处理多路流（可能需支持 SVC 分层编码），带宽占用较高。  
• **适用场景**：大规模直播、教育课堂（如声网、Zoom 的 SFU 架构）。  

---

### 方案选择建议
1. **Mesh**：适用于小规模、低预算且无需复杂控制的场景。  
2. **MCU**：适合对媒体质量要求高且具备硬件支持的封闭环境（如企业内部会议）。  
3. **SFU**：最优的大规模解决方案，结合 SVC（可伸缩视频编码）和带宽自适应技术，可平衡质量与资源消耗。

### 补充优化策略
• **混合架构**：结合 SFU 与 MCU，针对不同媒体类型（如音频混流、视频转发）优化资源分配。  
• **AI 驱动**：通过机器学习动态调整编解码参数、网络路由（如 EasyRTC 的 AI 优化模块）。  
• **边缘计算**：部署边缘节点减少传输跳数，提升实时性（适合全球分布式服务）。  

通过上述架构与方案，WebRTC 可灵活应对从一对一通话到万人级直播的多样化需求，开发者需根据具体场景权衡性能、成本与扩展性。



## [构建webRTC时需要的协议](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API/Protocols)
+ 构建webRTC API的基础协议如下

### ICE
[**Interactive Connectivity Establishment**](https://en.wikipedia.org/wiki/Interactive_Connectivity_Establishment)**<font style="color:rgb(0, 0, 0);"> (交互式连接建立 ICE) 是一个框架，旨在让您的网页浏览器能够与对等点（Peer）建立连接。</font>**<font style="color:rgb(0, 0, 0);"> 存在诸多原因导致无法直接从 </font>**<font style="color:rgb(0, 0, 0);">Peer A</font>**<font style="color:rgb(0, 0, 0);"> 直连到 </font>**<font style="color:rgb(0, 0, 0);">Peer B</font>**<font style="color:rgb(0, 0, 0);">。它需要绕过防火墙对建立连接的阻止；在您设备没有公网 IP 地址（public IP address）这一常见情况下，为您提供一个唯一的地址；以及如果您的路由器不允许您直接与其他对等点连接，则通过一台服务器中继（relay）数据。ICE 使用 </font>**<font style="color:rgb(0, 0, 0);">STUN</font>**<font style="color:rgb(0, 0, 0);"> 服务器和/或 </font>**<font style="color:rgb(0, 0, 0);">TURN</font>**<font style="color:rgb(0, 0, 0);"> 服务器来实现这些目标，如下所述。</font>

### STUN
[**Session Traversal Utilities for NAT**](https://en.wikipedia.org/wiki/STUN)**<font style="color:rgb(0, 0, 0);"> (NAT会话穿越工具 STUN)</font>**<font style="color:rgb(0, 0, 0);"> 是一种协议，用于发现您的公网地址（public address）并确定您路由器所使用的 </font>**<font style="color:rgb(0, 0, 0);">NAT</font>**<font style="color:rgb(0, 0, 0);"> 是否存在会阻止与对等点（peer）建立直接连接的限制。</font>

<font style="color:rgb(0, 0, 0);">客户端会向互联网上的 </font>**<font style="color:rgb(0, 0, 0);">STUN</font>**<font style="color:rgb(0, 0, 0);"> 服务器发送请求，该</font>**<font style="color:rgb(0, 0, 0);">服务器将回复告知客户端的公网地址</font>**<font style="color:rgb(0, 0, 0);">以及该客户端在路由器 </font>**<font style="color:rgb(0, 0, 0);">NAT</font>**<font style="color:rgb(0, 0, 0);"> 后方能否接收外部连接。</font>

![](https://cdn.nlark.com/yuque/0/2025/png/23201316/1755500809548-68ea5dda-1180-4c1b-9052-113d1758b089.png)



### NAT
[**Network Address Translation**](https://en.wikipedia.org/wiki/Network_address_translation)**<font style="color:rgb(0, 0, 0);"> (网络地址翻译 NAT)</font>**<font style="color:rgb(0, 0, 0);"> 用于为您的设备提供一个公网 IP 地址（public IP address）。一台路由器会拥有一个公网 IP 地址，而连接到该路由器的每个设备则拥有一个私有 IP 地址（private IP address）。设备发出的请求会从该设备的私有 IP 地址</font>**<font style="color:rgb(0, 0, 0);">转换</font>**<font style="color:rgb(0, 0, 0);">为路由器的公网 IP 地址，并附带一个唯一的</font>**<font style="color:rgb(0, 0, 0);">端口号（port）</font>**<font style="color:rgb(0, 0, 0);">。这样，您无需为每个设备都配置唯一的公网 IP 地址，但这些设备仍然可以在互联网上被访问到。</font>

<font style="color:rgb(0, 0, 0);">部分路由器会对可以连接其内部网络的设备施加访问限制。这可能意味着，即便我们通过 </font>**<font style="color:rgb(0, 0, 0);">STUN</font>**<font style="color:rgb(0, 0, 0);"> 服务器获取到了公网 IP 地址，也并非任何设备都能成功建立连接。这种情况下，我们需要使用 </font>**<font style="color:rgb(0, 0, 0);">TURN</font>**<font style="color:rgb(0, 0, 0);">（来建立连接）。</font>

### <font style="color:rgb(0, 0, 0);">TURN</font>
<font style="color:rgb(0, 0, 0);">某些使用 </font>**<font style="color:rgb(0, 0, 0);">NAT</font>**<font style="color:rgb(0, 0, 0);"> 的路由器会采用一种称为 </font>**<font style="color:rgb(0, 0, 0);">'Symmetric NAT'（对称型NAT）</font>**<font style="color:rgb(0, 0, 0);"> 的限制机制。这意味着路由器只会接受来自您先前已连接过的对等点（peer）的连接。</font>

[**Traversal Using Relays around NAT**](https://en.wikipedia.org/wiki/TURN)**<font style="color:rgb(0, 0, 0);"> (TURN)</font>**<font style="color:rgb(0, 0, 0);"> 旨在通过建立与 </font>**<font style="color:rgb(0, 0, 0);">TURN服务器（server）</font>**<font style="color:rgb(0, 0, 0);"> 的连接并</font>**<font style="color:rgb(0, 0, 0);">中继（relay）</font>**<font style="color:rgb(0, 0, 0);"> 所有信息流经该服务器，来绕过 </font>**<font style="color:rgb(0, 0, 0);">Symmetric NAT</font>**<font style="color:rgb(0, 0, 0);"> 的限制。您将与 </font>**<font style="color:rgb(0, 0, 0);">TURN服务器</font>**<font style="color:rgb(0, 0, 0);"> 建立一个连接，并告知所有对等点将数据包发送至该服务器，服务器随后会将这些数据包</font>**<font style="color:rgb(0, 0, 0);">转发（forward）</font>**<font style="color:rgb(0, 0, 0);"> 给您。这种方式显然会带来一些</font>**<font style="color:rgb(0, 0, 0);">额外开销（overhead）</font>**<font style="color:rgb(0, 0, 0);"> ，因此仅在其他替代方案均不可用时才会采用。</font>

<font style="color:rgb(0, 0, 0);"></font>

### <font style="color:rgb(0, 0, 0);">SDP</font>
[**Session Description Protocol**](https://en.wikipedia.org/wiki/Session_Description_Protocol)**<font style="color:rgb(0, 0, 0);"> (会话描述协议 SDP)</font>**<font style="color:rgb(0, 0, 0);"> 是一个用于描述连接的多媒体内容的</font>**<font style="color:rgb(0, 0, 0);">标准</font>**<font style="color:rgb(0, 0, 0);">，例如</font>**<font style="color:rgb(0, 0, 0);">分辨率（resolution）</font>**<font style="color:rgb(0, 0, 0);">、</font>**<font style="color:rgb(0, 0, 0);">格式（formats）</font>**<font style="color:rgb(0, 0, 0);">、</font>**<font style="color:rgb(0, 0, 0);">编解码器（codecs）</font>**<font style="color:rgb(0, 0, 0);">、</font>**<font style="color:rgb(0, 0, 0);">加密（encryption）</font>**<font style="color:rgb(0, 0, 0);">等。其目的在于，一旦数据传输开始，通信双方都能理解彼此交换的内容。本质上，SDP 是描述内容的</font>**<font style="color:rgb(0, 0, 0);">元数据（metadata）</font>**<font style="color:rgb(0, 0, 0);">，而非媒体内容本身。</font>

<font style="color:rgb(0, 0, 0);">因此，严格来说，SDP </font>**<font style="color:rgb(0, 0, 0);">并非严格意义上的协议（protocol）</font>**<font style="color:rgb(0, 0, 0);">，而是一种用于描述设备间共享媒体连接（connection that shares media between devices）的</font>**<font style="color:rgb(0, 0, 0);">数据格式（data format）</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);">对 SDP 进行详尽</font>**<font style="color:rgb(0, 0, 0);">记录（Documenting）</font>**<font style="color:rgb(0, 0, 0);"> 远超出本文档的范围（well outside the scope of this documentation）；但是，此处仍有几点值得关注。</font>

#### <font style="color:rgb(0, 0, 0);">structure</font>
**<font style="color:rgb(0, 0, 0);">SDP</font>**<font style="color:rgb(0, 0, 0);"> 由一个或多个 </font>**<font style="color:rgb(0, 0, 0);">UTF-8</font>**<font style="color:rgb(0, 0, 0);"> 文本行组成。每行以一个</font>**<font style="color:rgb(0, 0, 0);">单字符类型（one-character type）</font>**<font style="color:rgb(0, 0, 0);"> 开头，后跟一个等号（“=”），然后是结构化的文本（</font>**<font style="color:rgb(0, 0, 0);">structured text</font>**<font style="color:rgb(0, 0, 0);">），这些文本包含一个值或描述；其</font>**<font style="color:rgb(0, 0, 0);">格式取决于类型（format depends on the type）</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);">以特定字母开头的文本行，通常被称为该“字母 + </font>**<font style="color:rgb(0, 0, 0);">行（lines）</font>**<font style="color:rgb(0, 0, 0);">”。例如，用于提供</font>**<font style="color:rgb(0, 0, 0);">媒体描述（media descriptions）</font>**<font style="color:rgb(0, 0, 0);"> 的行类型为 </font>**<font style="color:rgb(0, 0, 0);">“m”</font>**<font style="color:rgb(0, 0, 0);">，因此这些行被称为 </font>**<font style="color:rgb(0, 0, 0);">“m-lines”</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

### <font style="color:rgb(0, 0, 0);">多方视频会议 (Multi-party video conferencing)</font>
<font style="color:rgb(0, 0, 0);">在 </font>**<font style="color:rgb(0, 0, 0);">WebRTC</font>**<font style="color:rgb(0, 0, 0);"> 点对点 (</font>**<font style="color:rgb(0, 0, 0);">peer-to-peer</font>**<font style="color:rgb(0, 0, 0);">) 网络中，对等点 (</font>**<font style="color:rgb(0, 0, 0);">peers</font>**<font style="color:rgb(0, 0, 0);">) 会基于设备能力和网络带宽协商合适的</font>**<font style="color:rgb(0, 0, 0);">视频编解码器 (video codecs)</font>**<font style="color:rgb(0, 0, 0);"> 和</font>**<font style="color:rgb(0, 0, 0);">流 (stream)</font>**<font style="color:rgb(0, 0, 0);">。然后，每个发送方会向其对应的对等点 </font>**<font style="color:rgb(0, 0, 0);">单播 ("singlecasts")</font>**<font style="color:rgb(0, 0, 0);"> 一个包含视频信息的流。</font>

<font style="color:rgb(0, 0, 0);">多方之间的视频会议则更为复杂，因为对等点可能具有不同的能力和</font>**<font style="color:rgb(0, 0, 0);">网络条件 (network conditions)</font>**<font style="color:rgb(0, 0, 0);">：一个特定的视频流</font>**<font style="color:rgb(0, 0, 0);">分辨率 (resolution)</font>**<font style="color:rgb(0, 0, 0);">、</font>**<font style="color:rgb(0, 0, 0);">码率 (rate)</font>**<font style="color:rgb(0, 0, 0);"> 和</font>**<font style="color:rgb(0, 0, 0);">质量 (quality)</font>**<font style="color:rgb(0, 0, 0);"> 可能并不适合所有接收方。同时，让发送方为众多接收方生成并发送多个流也是</font>**<font style="color:rgb(0, 0, 0);">低效 (efficient)</font>**<font style="color:rgb(0, 0, 0);"> 且</font>**<font style="color:rgb(0, 0, 0);">不可扩展 (scalable)</font>**<font style="color:rgb(0, 0, 0);"> 的。</font>

<font style="color:rgb(0, 0, 0);">解决这些问题最常用的方法是使用一个称为</font>**<font style="color:rgb(0, 0, 0);">选择性转发单元 (Selective Forwarding Unit, SFU)</font>**<font style="color:rgb(0, 0, 0);"> 或</font>**<font style="color:rgb(0, 0, 0);">选择性转发中间盒 (Selective Forwarding Middlebox, SFM)</font>**<font style="color:rgb(0, 0, 0);"> 的中介</font>**<font style="color:rgb(0, 0, 0);">服务器 (server)</font>**<font style="color:rgb(0, 0, 0);">。发送方输出经过</font>**<font style="color:rgb(0, 0, 0);">编码 (encoded)</font>**<font style="color:rgb(0, 0, 0);"> 的视频，以便 </font>**<font style="color:rgb(0, 0, 0);">SFM</font>**<font style="color:rgb(0, 0, 0);"> 能够为每个接收方</font>**<font style="color:rgb(0, 0, 0);">选择性转发 (selectively forward)</font>**<font style="color:rgb(0, 0, 0);"> 合适的视频流。在这种情况下，</font>**<font style="color:rgb(0, 0, 0);">WebRTC</font>**<font style="color:rgb(0, 0, 0);"> 用于编码视频主要有两种技术：</font>**<font style="color:rgb(0, 0, 0);">同播 (simulcast)</font>**<font style="color:rgb(0, 0, 0);"> 和</font>**<font style="color:rgb(0, 0, 0);">可扩展视频编码 (Scalable Video Coding, SVC)</font>**<font style="color:rgb(0, 0, 0);">。</font>

#### <font style="color:rgb(0, 0, 0);">同播 (Simulcast)</font>
**<font style="color:rgb(0, 0, 0);">同播 (Simulcast)</font>**<font style="color:rgb(0, 0, 0);"> 会在单独的流中同时发送具有不同</font>**<font style="color:rgb(0, 0, 0);">分辨率 (resolutions)</font>**<font style="color:rgb(0, 0, 0);"> 和</font>**<font style="color:rgb(0, 0, 0);">比特率 (bitrates)</font>**<font style="color:rgb(0, 0, 0);"> 的同一来源的多个版本。</font>**<font style="color:rgb(0, 0, 0);">SFM</font>**<font style="color:rgb(0, 0, 0);"> 基于接收方的网络条件和设备能力，将最合适的流转发给每个接收方。</font>

**<font style="color:rgb(0, 0, 0);">SFM</font>**<font style="color:rgb(0, 0, 0);"> 依赖确定</font>**<font style="color:rgb(0, 0, 0);">帧依赖关系 (frame dependency relationships)</font>**<font style="color:rgb(0, 0, 0);"> 的能力（例如帧链中</font>**<font style="color:rgb(0, 0, 0);">帧间帧 (interframes)</font>**<font style="color:rgb(0, 0, 0);"> 回溯到上一个</font>**<font style="color:rgb(0, 0, 0);">关键帧 (keyframe)</font>**<font style="color:rgb(0, 0, 0);"> 的依赖链），以便在接收方无感知的情况下转发</font>**<font style="color:rgb(0, 0, 0);">数据包 (packets)</font>**<font style="color:rgb(0, 0, 0);"> 和切换</font>**<font style="color:rgb(0, 0, 0);">同播层 (simulcast layers)</font>**<font style="color:rgb(0, 0, 0);">。</font>

**<font style="color:rgb(0, 0, 0);">VP8</font>**<font style="color:rgb(0, 0, 0);"> 和 </font>**<font style="color:rgb(0, 0, 0);">VP9 编解码器</font>**<font style="color:rgb(0, 0, 0);"> 可以分别在 </font>**<font style="color:rgb(0, 0, 0);">VP8 负载描述符 (VP8 payload descriptor)</font>**<font style="color:rgb(0, 0, 0);"> 和 </font>**<font style="color:rgb(0, 0, 0);">VP9 负载描述符 (VP9 payload descriptor)</font>**<font style="color:rgb(0, 0, 0);"> 中包含</font>**<font style="color:rgb(0, 0, 0);">帧依赖信息 (frame dependency information)</font>**<font style="color:rgb(0, 0, 0);">。对于 </font>**<font style="color:rgb(0, 0, 0);">AV1 编解码器</font>**<font style="color:rgb(0, 0, 0);">，该信息通过</font>**<font style="color:rgb(0, 0, 0);">依赖描述符 (Dependency Descriptor, DD)</font>****<font style="color:rgb(0, 0, 0);">RTP 头扩展 (RTP Header Extension)</font>**<font style="color:rgb(0, 0, 0);"> 发送。</font>

<font style="color:rgb(0, 0, 0);">最新的</font>**<font style="color:rgb(0, 0, 0);">浏览器实现 (browser implementations)</font>**<font style="color:rgb(0, 0, 0);"> 通常对所有编解码器都使用 </font>**<font style="color:rgb(0, 0, 0);">DD 头 (DD header)</font>**<font style="color:rgb(0, 0, 0);">，因为它是</font>**<font style="color:rgb(0, 0, 0);">编解码器无关的 (codec-agnostic)</font>**<font style="color:rgb(0, 0, 0);">，这可以简化 </font>**<font style="color:rgb(0, 0, 0);">SFM 的实现 (SFM implementation)</font>**<font style="color:rgb(0, 0, 0);">。此外，由于它是 </font>**<font style="color:rgb(0, 0, 0);">RTP 头 (RTP header)</font>**<font style="color:rgb(0, 0, 0);"> 的一部分，而不是</font>**<font style="color:rgb(0, 0, 0);">负载 (payload)</font>**<font style="color:rgb(0, 0, 0);">，因此它可以在</font>**<font style="color:rgb(0, 0, 0);">端到端加密 (end-to-end encryption, E2EE)</font>**<font style="color:rgb(0, 0, 0);"> 场景中使用。</font>

#### <font style="color:rgb(0, 0, 0);">可扩展视频编码 (Scalable Video Coding)</font>
**<font style="color:rgb(0, 0, 0);">可扩展视频编码 (Scalable Video Coding, SVC)</font>**<font style="color:rgb(0, 0, 0);"> 将视频源编码为</font>**<font style="color:rgb(0, 0, 0);">单个流 (single stream)</font>**<font style="color:rgb(0, 0, 0);">，该流包含</font>**<font style="color:rgb(0, 0, 0);">多个层 (multiple layers)</font>**<font style="color:rgb(0, 0, 0);">，可以选择性地解码这些层以获得特定分辨率、码率或质量的视频。</font>**<font style="color:rgb(0, 0, 0);">SFM</font>**<font style="color:rgb(0, 0, 0);"> 可以转发这些层的一个子集，以便为每个接收方的网络和设备发送合适的流。</font>

<font style="color:rgb(0, 0, 0);">请注意，当使用 </font>**<font style="color:rgb(0, 0, 0);">SVC</font>**<font style="color:rgb(0, 0, 0);"> 时，其</font>**<font style="color:rgb(0, 0, 0);">依赖关系 (dependencies)</font>**<font style="color:rgb(0, 0, 0);"> 比</font>**<font style="color:rgb(0, 0, 0);">同播 (simulcast)</font>**<font style="color:rgb(0, 0, 0);"> 中选择要转发的流所需的依赖关系要复杂得多（有关复杂性的“风味”，请参阅 SVC 规范中的依赖图）。</font>**<font style="color:rgb(0, 0, 0);">SVC 流 (SVC stream)</font>**<font style="color:rgb(0, 0, 0);"> 包含一个提供最低质量水平的</font>**<font style="color:rgb(0, 0, 0);">基础层 (base layer)</font>**<font style="color:rgb(0, 0, 0);">，并且可能包含多个</font>**<font style="color:rgb(0, 0, 0);">增强层 (enhancement layers)</font>**<font style="color:rgb(0, 0, 0);">，这些增强层允许改变</font>**<font style="color:rgb(0, 0, 0);">帧率（“时间可扩展性” "temporal scalability"）</font>**<font style="color:rgb(0, 0, 0);">、增加</font>**<font style="color:rgb(0, 0, 0);">分辨率（“空间可扩展性” "spatial scalability"）</font>**<font style="color:rgb(0, 0, 0);"> 以及相同分辨率下不同的比特率。</font>**<font style="color:rgb(0, 0, 0);">VP8 编解码器</font>**<font style="color:rgb(0, 0, 0);"> 仅支持</font>**<font style="color:rgb(0, 0, 0);">时间层 (temporal layers)</font>**<font style="color:rgb(0, 0, 0);">，而 </font>**<font style="color:rgb(0, 0, 0);">VP9</font>**<font style="color:rgb(0, 0, 0);"> 则同时支持</font>**<font style="color:rgb(0, 0, 0);">时间层</font>**<font style="color:rgb(0, 0, 0);">和</font>**<font style="color:rgb(0, 0, 0);">空间层 (spatial layers)</font>**<font style="color:rgb(0, 0, 0);">。</font>

**<font style="color:rgb(0, 0, 0);">VP8</font>**<font style="color:rgb(0, 0, 0);"> 和 </font>**<font style="color:rgb(0, 0, 0);">VP9 编解码器</font>**<font style="color:rgb(0, 0, 0);"> 可以分别在 </font>**<font style="color:rgb(0, 0, 0);">VP8 负载描述符</font>**<font style="color:rgb(0, 0, 0);"> 和 </font>**<font style="color:rgb(0, 0, 0);">VP9 负载描述符</font>**<font style="color:rgb(0, 0, 0);"> 中包含</font>**<font style="color:rgb(0, 0, 0);">帧依赖信息 (frame dependency information)</font>**<font style="color:rgb(0, 0, 0);">。对于 </font>**<font style="color:rgb(0, 0, 0);">AV1 编解码器</font>**<font style="color:rgb(0, 0, 0);">，该信息通过</font>**<font style="color:rgb(0, 0, 0);">依赖描述符 (Dependency Descriptor, DD)</font>****<font style="color:rgb(0, 0, 0);">RTP 头扩展 (RTP Header Extension)</font>**<font style="color:rgb(0, 0, 0);"> 发送。</font>

<font style="color:rgb(0, 0, 0);">对于</font>**<font style="color:rgb(0, 0, 0);">同播 (simulcast)</font>**<font style="color:rgb(0, 0, 0);"> 也是如此，最新的浏览器实现通常对所有支持 </font>**<font style="color:rgb(0, 0, 0);">SVC</font>**<font style="color:rgb(0, 0, 0);"> 的编解码器都使用 </font>**<font style="color:rgb(0, 0, 0);">DD 头 (DD header)</font>**<font style="color:rgb(0, 0, 0);">，以简化 </font>**<font style="color:rgb(0, 0, 0);">SFM 的实现 (SFM implementation)</font>**<font style="color:rgb(0, 0, 0);">，并且因为它支持</font>**<font style="color:rgb(0, 0, 0);">端到端加密 (end-to-end encryption, E2EE)</font>**<font style="color:rgb(0, 0, 0);"> 场景。</font>

**<font style="color:rgb(0, 0, 0);">Chrome 111</font>**<font style="color:rgb(0, 0, 0);"> 及更高版本支持 </font>**<font style="color:rgb(0, 0, 0);">SVC</font>**<font style="color:rgb(0, 0, 0);">。在撰写本文时（大约 </font>**<font style="color:rgb(0, 0, 0);">Firefox 136</font>**<font style="color:rgb(0, 0, 0);"> 左右），</font>**<font style="color:rgb(0, 0, 0);">Firefox</font>**<font style="color:rgb(0, 0, 0);"> 尚不支持 </font>**<font style="color:rgb(0, 0, 0);">SVC</font>**<font style="color:rgb(0, 0, 0);">。</font>

**<font style="color:rgb(0, 0, 0);">依赖描述符 (Dependency Descriptor) RTP 头扩展</font>**

**<font style="color:rgb(0, 0, 0);">依赖描述符 (Dependency Descriptor, DD) RTP 头扩展</font>**<font style="color:rgb(0, 0, 0);"> 定义在规范 </font>**<font style="color:rgb(0, 0, 0);">RTP Payload Format For AV1 (v1.0)</font>**<font style="color:rgb(0, 0, 0);"> 中，它提供了一种</font>**<font style="color:rgb(0, 0, 0);">编解码器无关 (codec-agnostic)</font>**<font style="color:rgb(0, 0, 0);">、</font>**<font style="color:rgb(0, 0, 0);">灵活 (flexible)</font>**<font style="color:rgb(0, 0, 0);">、</font>**<font style="color:rgb(0, 0, 0);">高效 (efficient)</font>**<font style="color:rgb(0, 0, 0);"> 且</font>**<font style="color:rgb(0, 0, 0);">可扩展 (extensible)</font>**<font style="color:rgb(0, 0, 0);"> 的方式，来描述</font>**<font style="color:rgb(0, 0, 0);">多层视频流 (multi-layered video stream)</font>**<font style="color:rgb(0, 0, 0);"> 中</font>**<font style="color:rgb(0, 0, 0);">帧 (frames)</font>**<font style="color:rgb(0, 0, 0);"> 之间的关系。</font>

**<font style="color:rgb(0, 0, 0);">SFM</font>**<font style="color:rgb(0, 0, 0);"> 可以使用这些信息来选择和转发与</font>**<font style="color:rgb(0, 0, 0);">目标接收方 (recipient)</font>**<font style="color:rgb(0, 0, 0);"> 预定接收的层相关的数据包。由于该</font>**<font style="color:rgb(0, 0, 0);">头 (header)</font>**<font style="color:rgb(0, 0, 0);"> 是一个</font>**<font style="color:rgb(0, 0, 0);">真正的扩展 (true extension)</font>**<font style="color:rgb(0, 0, 0);">，它不是</font>**<font style="color:rgb(0, 0, 0);">负载 (payload)</font>**<font style="color:rgb(0, 0, 0);"> 的一部分，因此在</font>**<font style="color:rgb(0, 0, 0);">端到端加密 (end-to-end encryption, E2EE)</font>**<font style="color:rgb(0, 0, 0);"> 场景中对 </font>**<font style="color:rgb(0, 0, 0);">SFM</font>**<font style="color:rgb(0, 0, 0);"> 仍然</font>**<font style="color:rgb(0, 0, 0);">可用 (available)</font>**<font style="color:rgb(0, 0, 0);">。</font>

**<font style="color:rgb(0, 0, 0);">Chrome</font>**<font style="color:rgb(0, 0, 0);"> 和 </font>**<font style="color:rgb(0, 0, 0);">Firefox (136+)</font>**<font style="color:rgb(0, 0, 0);"> 支持 </font>**<font style="color:rgb(0, 0, 0);">DD 头 (DD header)</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);"></font>

## <font style="color:rgb(0, 0, 0);">RTP协议</font>
**<font style="color:rgb(0, 0, 0);">实时传输协议 (Real-time Transport Protocol, RTP)</font>**<font style="color:rgb(0, 0, 0);"> 在 </font>[RFC(3550)](https://datatracker.ietf.org/doc/html/rfc3550)<font style="color:rgb(0, 0, 0);"> 中定义，是 IETF 的标准协议，用于为需要实时优先级的交换数据提供实时连接。</font>

> <font style="color:rgba(0, 0, 0, 0.4);">WebRTC 实际使用 </font>**<font style="color:rgba(0, 0, 0, 0.4);">安全实时传输协议 (Secure Real-time Transport Protocol, SRTP)</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 来确保交换数据的安全性和身份验证。</font>
>

<font style="color:rgb(0, 0, 0);">最小化延迟对 WebRTC 尤为重要，因为面对面通信需要尽可能低的 </font>[latency](https://developer.mozilla.org/zh-CN/docs/Glossary/Latency)<font style="color:rgb(0, 0, 0);">（延迟）。用户说话到对方听到之间的时间差越大，越可能出现插话干扰或其他形式的沟通混乱。</font>

<font style="color:rgba(0, 0, 0, 0.9);"></font>

### <font style="color:rgba(0, 0, 0, 0.9);">RTP 的关键特性</font>
<font style="color:rgb(0, 0, 0);">RTP 是数据传输协议，其使命是在当前条件下尽可能高效地在两个端点间移动数据。这些条件可能受网络协议栈底层、物理网络连接、中间网络、远端端点性能、噪声水平、流量水平等多种因素影响。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">由于 RTP 是数据传输协议，它由密切相关的 </font>**<font style="color:rgb(0, 0, 0);">RTP 控制协议 (RTP Control Protocol, RTCP)</font>**<font style="color:rgb(0, 0, 0);"> 增强功能，该协议定义于 </font>[<font style="color:rgb(0, 105, 194);">RFC 3550, section 6</font>](https://datatracker.ietf.org/doc/html/rfc3550#section-6)<font style="color:rgb(0, 0, 0);">。RTCP 增加了 </font>**<font style="color:rgb(0, 0, 0);">服务质量 (Quality of Service, QoS)</font>**<font style="color:rgb(0, 0, 0);"> 监控、参与者信息共享等功能。虽然它不足以完全管理用户、成员、权限等，但提供了无限制多方通信会话所需的基础功能。</font>

<font style="color:rgb(0, 0, 0);">RTCP 与 RTP 定义在同一 RFC 中的事实，恰恰表明这两个协议密切相关。</font>

### <font style="color:rgba(0, 0, 0, 0.9);">RTP 的能力</font>
<font style="color:rgb(0, 0, 0);">RTP 在 WebRTC 中的主要优势包括：</font>

+ <font style="color:rgb(0, 0, 0);">通常具有低延迟</font>
+ <font style="color:rgb(0, 0, 0);">数据包自带序列号和时间戳，支持乱序到达后的重组，使 RTP 可在不保证顺序甚至不保证交付的传输上工作</font>
+ <font style="color:rgb(0, 0, 0);">这意味着 RTP 可以（但非必须）基于 </font>[<font style="color:rgb(0, 105, 194);">UDP</font>](https://developer.mozilla.org/en-US/docs/Glossary/UDP)<font style="color:rgb(0, 0, 0);">，利用其性能、多路复用和校验和特性</font>
+ <font style="color:rgb(0, 0, 0);">RTP 支持组播 (multicast) —— 这对 WebRTC 暂不重要，但未来可能至关重要（当 WebRTC 有望支持多方会话时）</font>
+ <font style="color:rgb(0, 0, 0);">RTP 不仅限于音视频通信，可用于任何形式的连续或活动数据传输，包括数据流传输、活动徽章/状态更新显示、控制和测量信息传输等。</font>

### <font style="color:rgba(0, 0, 0, 0.9);">RTP 不具备的功能</font>
<font style="color:rgb(0, 0, 0);">RTP 本身不提供所有可能的功能，这也是 WebRTC 还需使用其他协议的原因。RTP 未包含的重要能力包括：</font>

+ <font style="color:rgb(0, 0, 0);">RTP </font>**<font style="color:rgb(0, 0, 0);">不</font>**<font style="color:rgb(0, 0, 0);">保证 </font>**<font style="color:rgb(0, 0, 0);">服务质量 (quality-of-service, QoS)</font>**
+ <font style="color:rgb(0, 0, 0);">尽管 RTP 设计用于延迟敏感场景，但本身不提供确保 QoS 的特性，仅提供允许在协议栈其他层级实现 QoS 的必要信息</font>
+ <font style="color:rgb(0, 0, 0);">RTP 不处理可能需要资源的分配或预留</font>

<font style="color:rgb(0, 0, 0);">在 WebRTC 中，这些问题在基础设施的不同层级处理。例如 RTCP 负责 QoS 监控。</font>

## <font style="color:rgba(0, 0, 0, 0.9);">RTCPeerConnection 与 RTP</font>
<font style="color:rgb(0, 0, 0);">每个 </font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)<font style="color:rgb(0, 0, 0);"> 都包含访问连接中 RTP 传输层的方法，对应三种传输类型：</font>

+ [<font style="color:rgb(0, 105, 194);">RTCRtpSender</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender)

<font style="color:rgb(0, 0, 0);">处理 </font>[<font style="color:rgb(0, 105, 194);">MediaStreamTrack</font>](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack)<font style="color:rgb(0, 0, 0);">数据的编码和传输到远端节点。通过 </font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.getSenders()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders)<font style="color:rgb(0, 0, 0);">获取</font>

+ [<font style="color:rgb(0, 105, 194);">RTCRtpReceiver</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver)

<font style="color:rgb(0, 0, 0);">提供检查和获取流入的 </font>`<font style="color:rgb(0, 0, 0);">MediaStreamTrack</font>`<font style="color:rgb(0, 0, 0);">数据信息的能力。通过</font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.getReceivers()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getReceivers)<font style="color:rgb(0, 0, 0);"> 获取</font>

+ [<font style="color:rgb(0, 105, 194);">RTCRtpTransceiver</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpTransceiver)

<font style="color:rgb(0, 0, 0);">由共享 SDP </font>`<font style="color:rgb(0, 0, 0);">mid</font>`<font style="color:rgb(0, 0, 0);">属性的 RTP 发送器和接收器组成的配对（意味着它们共享相同的 SDP 媒体 m-line，代表双向 SRTP 流）。通过 </font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.getTransceivers()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getTransceivers)<font style="color:rgb(0, 0, 0);">获取，每个 </font>`<font style="color:rgb(0, 0, 0);">mid</font>`<font style="color:rgb(0, 0, 0);">和收发器存在一一对应关系</font>

### <font style="color:rgba(0, 0, 0, 0.9);">利用 RTP 实现"保留"功能</font>
<font style="color:rgb(0, 0, 0);">由于 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">的流通过 RTP 和</font>[上述接口](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Intro_to_RTP#rtcpeerconnection_and_rtp)<font style="color:rgb(0, 0, 0);">实现，您可以利用其对流内部结构的访问进行调整。最简单的应用之一是实现"保留 (hold)"功能：</font>**<font style="color:rgb(0, 0, 0);">通话中的参与者点击按钮后，可关闭麦克风、开始向对方发送音乐，并停止接收传入音频</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);">下例中：</font>

+ <font style="color:rgb(0, 0, 0);">启用"保留"功能的节点称为本地节点 (local peer)</font>
+ <font style="color:rgb(0, 0, 0);">被保留的节点称为远端节点 (remote peer)</font>

#### <font style="color:rgba(0, 0, 0, 0.9);">激活保留模式</font>
##### <font style="color:rgba(0, 0, 0, 0.9);">本地节点</font>
<font style="color:rgb(0, 0, 0);">当本地用户启用保留模式时，调用 </font>`<font style="color:rgb(0, 0, 0);">enableHold()</font>`<font style="color:rgb(0, 0, 0);">方法（参数为包含保留音乐的 </font>[<font style="color:rgb(0, 105, 194);">MediaStream</font>](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)<font style="color:rgb(0, 0, 0);">）：</font>

```javascript
async function enableHold(audioStream) {
  try {
    await audioTransceiver.sender.replaceTrack(audioStream.getAudioTracks()[0]);
    audioTransceiver.receiver.track.enabled = false;
    audioTransceiver.direction = "sendonly";
  } catch (err) {
    /* 错误处理 */
  }
}
```

`<font style="color:rgb(0, 0, 0);">try</font>`<font style="color:rgb(0, 0, 0);">代码块中的三个步骤：</font>

1. <font style="color:rgb(0, 0, 0);">将发送音轨替换为保留音乐的 {{domxref("MediaStreamTrack")}}</font>
2. <font style="color:rgb(0, 0, 0);">禁用传入音轨</font>
3. <font style="color:rgb(0, 0, 0);">将音频收发器切换为仅发送模式 (send-only)</font>

<font style="color:rgb(0, 0, 0);">这会触发 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">的协商机制，产生 </font>[<font style="color:rgb(0, 105, 194);">negotiationneeded</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/negotiationneeded_event)<font style="color:rgb(0, 0, 0);">事件。响应该事件后，代码通过 </font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.createOffer</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer)<font style="color:rgb(0, 0, 0);">生成 SDP offer，再通过信令服务器发送给远端节点。</font>

<font style="color:rgb(0, 0, 0);"></font>

`<font style="color:rgb(0, 0, 0);">audioStream</font>`<font style="color:rgb(0, 0, 0);">（替代麦克风音频的流）可来自任何源头。例如：通过隐藏的</font>[<font style="color:rgb(0, 105, 194);"><audio></font>](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio)<font style="color:rgb(0, 0, 0);">元素和 </font>[<font style="color:rgb(0, 105, 194);">HTMLAudioElement.captureStream()</font>](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream)<font style="color:rgb(0, 0, 0);"> 获取其音频流。</font>

##### <font style="color:rgba(0, 0, 0, 0.9);">远端节点</font>
<font style="color:rgb(0, 0, 0);">当远端收到方向性 (directionality) 为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">"sendonly"</font>`<font style="color:rgb(0, 0, 0);">的 SDP offer 时，用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">holdRequested()</font>`<font style="color:rgb(0, 0, 0);">方法处理：</font>

```javascript
async function holdRequested(offer) {
  try {
    await peerConnection.setRemoteDescription(offer);
    await audioTransceiver.sender.replaceTrack(null);
    audioTransceiver.direction = "recvonly";
    await sendAnswer();
  } catch (err) {
    /* 错误处理 */
  }
}
```

<font style="color:rgb(0, 0, 0);">步骤说明：</font>

1. <font style="color:rgb(0, 0, 0);">通过 </font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.setRemoteDescription()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription)<font style="color:rgb(0, 0, 0);"> 设置远端描述</font>
2. <font style="color:rgb(0, 0, 0);">将音频收发器的</font>[<font style="color:rgb(0, 105, 194);">RTCRtpSender</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender)<font style="color:rgb(0, 0, 0);"> 音轨设为 </font>`<font style="color:rgb(0, 0, 0);">null</font>`<font style="color:rgb(0, 0, 0);">（停止发送音频）</font>
3. <font style="color:rgb(0, 0, 0);">设置收发器</font>[方向](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpTransceiver/direction)<font style="color:rgb(0, 0, 0);">为仅接收 (recvonly)</font>
4. <font style="color:rgb(0, 0, 0);">通过 </font>`<font style="color:rgb(0, 0, 0);">sendAnswer()</font>`<font style="color:rgb(0, 0, 0);">生成并发送 SDP answer（内部使用 </font>[<font style="color:rgb(0, 105, 194);">createAnswer()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer)<font style="color:rgb(27, 27, 27);"> </font><font style="color:rgb(0, 0, 0);">）</font>

#### <font style="color:rgba(0, 0, 0, 0.9);">停用保留模式</font>
##### <font style="color:rgba(0, 0, 0, 0.9);">本地节点</font>
<font style="color:rgb(0, 0, 0);">当用户点击界面关闭保留时，调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">disableHold()</font>`<font style="color:rgb(0, 0, 0);">恢复功能：</font>

```javascript
async function disableHold(micStream) {
  await audioTransceiver.sender.replaceTrack(micStream.getAudioTracks()[0]);
  audioTransceiver.receiver.track.enabled = true;
  audioTransceiver.direction = "sendrecv";
}
```

<font style="color:rgb(0, 0, 0);">逆向操作步骤：</font>

1. <font style="color:rgb(0, 0, 0);">用麦克风音轨替换发送音轨</font>
2. <font style="color:rgb(0, 0, 0);">重新启用传入音轨</font>
3. <font style="color:rgb(0, 0, 0);">将收发器方向设为双向收发 (sendrecv)</font>

<font style="color:rgb(0, 0, 0);">此时将再次触发协商，生成新 offer 发送给远端。</font>

##### <font style="color:rgba(0, 0, 0, 0.9);">远端节点</font>
<font style="color:rgb(0, 0, 0);">当收到</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">"sendrecv"</font>`<font style="color:rgb(0, 0, 0);">offer 后：</font>

```javascript
async function holdEnded(offer, micStream) {
  try {
    await peerConnection.setRemoteDescription(offer);
    await audioTransceiver.sender.replaceTrack(micStream.getAudioTracks()[0]);
    audioTransceiver.direction = "sendrecv";
    await sendAnswer();
  } catch (err) {
    /* 错误处理 */
  }
}
```

<font style="color:rgb(0, 0, 0);">关键步骤：</font>

1. <font style="color:rgb(0, 0, 0);">设置远端描述</font>
2. <font style="color:rgb(0, 0, 0);">将发送音轨恢复为麦克风音轨</font>
3. <font style="color:rgb(0, 0, 0);">设置收发器方向为双向收发</font>
4. <font style="color:rgb(0, 0, 0);">发送 answer</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);"></font>

## <font style="color:rgb(0, 0, 0);">webRTC Connectivity</font>
+ <font style="color:rgb(0, 0, 0);">描述了各种 WebRTC 相关协议之间如何相互作用，以建立连接并在对等端（peers）之间传输数据和/或媒体。</font>

### <font style="color:rgb(0, 0, 0);">信令 (Signaling)</font>
<font style="color:rgb(0, 0, 0);">遗憾的是，</font>**<font style="color:rgb(0, 0, 0);">WebRTC 无法在没有某种中间服务器的情况下建立连接</font>**<font style="color:rgb(0, 0, 0);">。我们称之为</font>**<font style="color:rgb(0, 0, 0);">信令通道（signal channel）或信令服务（signaling service）</font>**<font style="color:rgb(0, 0, 0);">。它可以是任何形式的通信通道，用于在建立连接之前交换信息，无论是通过电子邮件、明信片还是信鸽（carrier pigeon）。这完全取决于你。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">我们需要</font>**<font style="color:rgb(0, 0, 0);">交换的信息是 Offer 和 Answer，它们仅包含下面提到的 SDP</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">对等端 A（Peer A）作为连接的发起方（initiator），将创建一个 Offer。然后，它会通过选择的信令通道将这个 Offer 发送给对等端 B（Peer B）。对等端 B 将从信令通道接收到 Offer，并创建一个 Answer。然后，它会通过信令通道将这个 Answer 发送回对等端 A。</font>



### 会话描述 (Session descriptions)


<font style="color:rgb(0, 0, 0);">WebRTC 连接上一个端点的配置称为会话描述（session description）。该描述包括关于所发送媒体类型、其格式、所使用的传输协议、端点的 IP 地址和端口，以及其他描述媒体传输端点所需的信息。这些信息使用</font>**<font style="color:rgb(0, 0, 0);">会话描述协议（Session Description Protocol, SDP）进行交换和存储</font>**<font style="color:rgb(0, 0, 0);">；如果你想知道 SDP 数据的格式细节，可以在 RFC 8866 中找到。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">当用户向另一个用户发起 WebRTC 呼叫时，会创建一个特殊的描述，称为 Offer（提议）。该描述包括呼叫方（caller）提议的呼叫配置的所有信息。然后，接收方（recipient）回应一个 Answer（应答），这是他们呼叫端的描述。通过这种方式，两个设备共享了交换媒体数据所需的信息。这种交换是使用交互式连接建立（Interactive Connectivity Establishment, ICE） 协议处理的，该协议允许两个设备即使被网络地址转换（Network Address Translation, NAT） 隔离，也能通过中介交换 Offer 和 Answer。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">因此，每个对等端保持两个描述：本地描述（local description），描述自身；以及远端描述（remote description），描述呼叫的另一端。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">Offer/Answer 过程不仅发生在首次建立呼叫时，也发生在呼叫的格式或其他配置需要更改的任何时候。无论是新呼叫还是重新配置现有呼叫，以下是为交换 Offer 和 Answer 必须发生的基本步骤（暂时省略 ICE 层）：</font>

1. <font style="color:rgb(0, 0, 0);">呼叫方（caller）通过 </font>[<font style="color:rgb(0, 105, 194);">MediaDevices.getUserMedia</font>](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)<font style="color:rgb(0, 0, 0);">捕获本地媒体（Media）。</font>
2. <font style="color:rgb(0, 0, 0);">呼叫方创建 RTCPeerConnection并调用 </font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.addTrack()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack)<font style="color:rgb(0, 0, 0);">（因为 addStream正在废弃）。</font>
3. <font style="color:rgb(0, 0, 0);">呼叫方调用</font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.createOffer()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer)<font style="color:rgb(0, 0, 0);">来创建 Offer。</font>
4. <font style="color:rgb(0, 0, 0);">呼叫方调用 </font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.setLocalDescription()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription)<font style="color:rgb(0, 0, 0);">将该 Offer 设置为本地描述（即连接本地端的描述）。</font>
5. <font style="color:rgb(0, 0, 0);">在 setLocalDescription()之后，</font>**<font style="color:rgb(0, 0, 0);">呼叫方请求 STUN 服务器生成 ice candidates</font>**<font style="color:rgb(0, 0, 0);">。</font>
6. <font style="color:rgb(0, 0, 0);">呼叫方使用信令服务器（signaling server）将 Offer 传输给预期的呼叫接收方（receiver）。</font>
7. <font style="color:rgb(0, 0, 0);">接收方收到 Offer 并调用 </font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.setRemoteDescription()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription)<font style="color:rgb(27, 27, 27);"></font><font style="color:rgb(0, 0, 0);">将其记录为远端描述（连接另一端的描述）。</font>
8. <font style="color:rgb(0, 0, 0);">接收方为其呼叫端进行任何所需的设置：捕获其本地媒体，并通过</font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.addTrack()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack)<font style="color:rgb(0, 0, 0);">将每个媒体轨道（media tracks）附加到 RTCPeerConnection中。</font>
9. <font style="color:rgb(0, 0, 0);">然后接收方通过调用</font><font style="color:rgb(27, 27, 27);"></font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.createAnswer()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer)<font style="color:rgb(0, 0, 0);">创建 Answer。</font>
10. <font style="color:rgb(0, 0, 0);">接收方调用</font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.setLocalDescription()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription)<font style="color:rgb(0, 0, 0);">，传入创建的 Answer，将其设置为其本地描述。接收方现在知道连接两端的配置。</font>
11. <font style="color:rgb(0, 0, 0);">接收方使用信令服务器将 Answer 发送给呼叫方。</font>
12. <font style="color:rgb(0, 0, 0);">呼叫方收到 Answer。</font>
13. <font style="color:rgb(0, 0, 0);">呼叫方调用</font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.setRemoteDescription()</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription)<font style="color:rgb(0, 0, 0);">()将 Answer 设置为其端的远端描述。呼叫方现在知道两个对等端的配置。媒体开始按照配置流动。</font>

**<font style="color:rgb(0, 0, 0);"></font>**

### <font style="color:rgb(0, 0, 0);">待定和当前描述（Pending and current descriptions）</font>
<font style="color:rgb(0, 0, 0);">更深入一步看这个过程，我们会发现返回这两个描述的属性 </font>`<font style="color:rgb(0, 0, 0);">localDescription</font>`<font style="color:rgb(0, 0, 0);">和 </font>`<font style="color:rgb(0, 0, 0);">remoteDescription</font>`<font style="color:rgb(0, 0, 0);">并不像它们看起来那么简单。因为在重新协商（renegotiation）期间，一个 </font>**<font style="color:rgb(0, 0, 0);">Offer</font>**<font style="color:rgb(0, 0, 0);"> 可能因为提出了不兼容的格式而被拒绝，所以每个端点都需要有能力提出一个新格式，但在另一个对等端接受之前，实际上并不切换到它。为此，WebRTC 使用了待定（pending）和当前（current）描述。</font>

<font style="color:rgb(0, 0, 0);"></font>

**<font style="color:rgb(0, 0, 0);">当前描述（current description）</font>**<font style="color:rgb(0, 0, 0);">（由</font>`[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.currentLocalDescription</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/currentLocalDescription)`<font style="color:rgb(0, 0, 0);">和</font>[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.currentRemoteDescription</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/currentRemoteDescription)<font style="color:rgb(0, 0, 0);">属性返回）代表连接当前实际在使用的描述。这是双方最近一致同意使用的最新连接。</font>

<font style="color:rgb(0, 0, 0);"></font>

**<font style="color:rgb(0, 0, 0);">待定描述（pending description）</font>**<font style="color:rgb(0, 0, 0);">（由</font>`[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.pendingLocalDescription</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/pendingLocalDescription)`<font style="color:rgb(0, 0, 0);">和 </font>`[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.pendingRemoteDescription</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/pendingRemoteDescription)`<font style="color:rgb(0, 0, 0);">返回）表示在分别调用 </font>`<font style="color:rgb(0, 0, 0);">setLocalDescription()</font>`<font style="color:rgb(0, 0, 0);">或 </font>`<font style="color:rgb(0, 0, 0);">setRemoteDescription()</font>`<font style="color:rgb(0, 0, 0);">之后，当前正在考虑中的描述。</font>

<font style="color:rgb(0, 0, 0);"></font>

**<font style="color:rgb(0, 0, 0);">当读取描述（由 </font>**`[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.localDescription</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/localDescription)`**<font style="color:rgb(0, 0, 0);">和 </font>**`[<font style="color:rgb(0, 105, 194);">RTCPeerConnection.remoteDescription</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/remoteDescription)`**<font style="color:rgb(0, 0, 0);">返回）时，返回的值是：如果有待定描述（即待定描述不为 </font>**`**<font style="color:rgb(0, 0, 0);">null</font>**`**<font style="color:rgb(0, 0, 0);">）</font>**<font style="color:rgb(0, 0, 0);">，则为 </font>`<font style="color:rgb(0, 0, 0);">pendingLocalDescription</font>`<font style="color:rgb(0, 0, 0);">/</font>`<font style="color:rgb(0, 0, 0);">pendingRemoteDescription</font>`<font style="color:rgb(0, 0, 0);">的值；否则，返回当前描述（</font>`<font style="color:rgb(0, 0, 0);">currentLocalDescription</font>`<font style="color:rgb(0, 0, 0);">/</font>`<font style="color:rgb(0, 0, 0);">currentRemoteDescription</font>`<font style="color:rgb(0, 0, 0);">）。</font>

<font style="color:rgb(0, 0, 0);"></font>

**<font style="color:rgb(0, 0, 0);">当通过调用 </font>**`**<font style="color:rgb(0, 0, 0);">setLocalDescription()</font>**`**<font style="color:rgb(0, 0, 0);">或 </font>**`**<font style="color:rgb(0, 0, 0);">setRemoteDescription()</font>**`**<font style="color:rgb(0, 0, 0);">更改描述时，指定的描述会被设置为待定描述，WebRTC 层开始评估它是否可接受。一旦提议的描述被双方同意，</font>**`**<font style="color:rgb(0, 0, 0);">currentLocalDescription</font>**`**<font style="color:rgb(0, 0, 0);">或 </font>**`**<font style="color:rgb(0, 0, 0);">currentRemoteDescription</font>**`**<font style="color:rgb(0, 0, 0);">的值会更改为该待定描述，然后待定描述再次被设置为 </font>**`**<font style="color:rgb(0, 0, 0);">null</font>**`**<font style="color:rgb(0, 0, 0);">，表示没有待定的描述。</font>**

<font style="color:rgb(0, 0, 0);"></font>

_<font style="color:rgb(0, 0, 0);">注意：</font>_`_<font style="color:rgb(0, 0, 0);">pendingLocalDescription</font>_`_<font style="color:rgb(0, 0, 0);">不仅包含正在考虑的 </font>__<font style="color:rgb(0, 0, 0);">Offer</font>__<font style="color:rgb(0, 0, 0);"> 或 </font>__<font style="color:rgb(0, 0, 0);">Answer</font>__<font style="color:rgb(0, 0, 0);">，还包含自该 </font>__<font style="color:rgb(0, 0, 0);">Offer</font>__<font style="color:rgb(0, 0, 0);"> 或 </font>__<font style="color:rgb(0, 0, 0);">Answer</font>__<font style="color:rgb(0, 0, 0);"> 创建以来已经收集到的任何本地 </font>__<font style="color:rgb(0, 0, 0);">ICE candidates</font>__<font style="color:rgb(0, 0, 0);">。同样，</font>_`_<font style="color:rgb(0, 0, 0);">pendingRemoteDescription</font>_`_<font style="color:rgb(0, 0, 0);">包含任何已通过调用</font>__<font style="color:rgb(0, 0, 0);"> </font>_`_<font style="color:rgb(0, 0, 0);">RTCPeerConnection.addIceCandidate()</font>_`_<font style="color:rgb(0, 0, 0);">提供的远端 </font>__<font style="color:rgb(0, 0, 0);">ICE candidates</font>__<font style="color:rgb(0, 0, 0);">。</font>_

_<font style="color:rgb(0, 0, 0);"></font>_

<font style="color:rgb(0, 0, 0);">有关这些属性和方法的更多细节，请参阅各自的文章。有关 WebRTC 支持的</font>**<font style="color:rgb(0, 0, 0);">编解码器（codecs）</font>**<font style="color:rgb(0, 0, 0);">以及哪些浏览器兼容哪些编解码器的信息，请参阅 </font>**<font style="color:rgb(0, 0, 0);">WebRTC 使用的编解码器（Codecs used by WebRTC）</font>**<font style="color:rgb(0, 0, 0);">。该编解码器指南也提供了帮助选择最适合需求的编解码器的指导。</font>

**<font style="color:rgb(0, 0, 0);"></font>**

### <font style="color:rgb(0, 0, 0);">ICE 候选（ICE candidates）</font>
<font style="color:rgb(0, 0, 0);">除了交换关于媒体的信息（上面在 </font>**<font style="color:rgb(0, 0, 0);">Offer/Answer</font>**<font style="color:rgb(0, 0, 0);"> 和 </font>**<font style="color:rgb(0, 0, 0);">SDP</font>**<font style="color:rgb(0, 0, 0);"> 中讨论过），</font>**<font style="color:rgb(0, 0, 0);">对等端还必须交换关于网络连接的信息。这称为 ICE 候选（ICE candidate）</font>**<font style="color:rgb(0, 0, 0);">，详细说明了该对等端能够进行通信（直接或通过 </font>**<font style="color:rgb(0, 0, 0);">TURN</font>**<font style="color:rgb(0, 0, 0);"> 服务器）的可用方法。通常，每个对等端会首先提议其最好的候选，然后逐步提议更次的候选。理想情况下，候选是 </font>**<font style="color:rgb(0, 0, 0);">UDP</font>**<font style="color:rgb(0, 0, 0);">（因为它更快，并且媒体流能够相对容易地从中断中恢复），但 </font>**<font style="color:rgb(0, 0, 0);">ICE</font>**<font style="color:rgb(0, 0, 0);"> 标准也允许 </font>**<font style="color:rgb(0, 0, 0);">TCP</font>**<font style="color:rgb(0, 0, 0);"> 候选。</font>

> _<font style="color:rgb(0, 0, 0);">通常，只有在 UDP 不可用或受到限制以至于不适合媒体流传输时，才会使用 TCP 类型的 ICE 候选。但是，并非所有浏览器都支持 ICE over TCP。</font>_
>

_<font style="color:rgb(0, 0, 0);"></font>_

**<font style="color:rgb(0, 0, 0);">ICE</font>**<font style="color:rgb(0, 0, 0);"> 允许候选表示通过 </font>[**TCP** ](https://developer.mozilla.org/en-US/docs/Glossary/TCP)<font style="color:rgb(0, 0, 0);">或 </font>[**UDP**](https://developer.mozilla.org/en-US/docs/Glossary/UDP)<font style="color:rgb(0, 0, 0);"> 的连接，</font>**<font style="color:rgb(0, 0, 0);">通常优先使用</font>**<font style="color:rgb(0, 0, 0);"> </font>**<font style="color:rgb(0, 0, 0);">UDP</font>**<font style="color:rgb(0, 0, 0);">（并且得到更广泛的支持）。每种协议支持几种类型的候选，候选类型定义了数据如何从一个对等端传输到另一个对等端。</font>

**<font style="color:rgb(0, 0, 0);"></font>**

#### <font style="color:rgb(0, 0, 0);">UDP 候选类型（UDP candidate types）</font>
<font style="color:rgb(0, 0, 0);">UDP 候选（其协议（</font>[protocol](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/protocol)<font style="color:rgb(0, 0, 0);">）设置为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">udp</font>`<font style="color:rgb(0, 0, 0);">的候选）可以是以下类型之一：</font>

+ `**<font style="color:rgb(0, 0, 0);">host</font>**`<font style="color:rgb(0, 0, 0);">：主机候选（host candidate）是其 </font>[**IP**](about:blank)<font style="color:rgb(0, 0, 0);"> 地址即为远端对等端的实际直接 </font>**<font style="color:rgb(0, 0, 0);">IP</font>**<font style="color:rgb(0, 0, 0);"> 地址的候选。</font>
+ `**<font style="color:rgb(0, 0, 0);">prflx</font>**`<font style="color:rgb(0, 0, 0);">：对等端反射候选（peer reflexive candidate）是其 </font>**<font style="color:rgb(0, 0, 0);">IP</font>**<font style="color:rgb(0, 0, 0);"> 地址来自两个对等端之间的对称 </font>**<font style="color:rgb(0, 0, 0);">NAT</font>**<font style="color:rgb(0, 0, 0);"> 的候选，通常在</font>**<font style="color:rgb(0, 0, 0);">滴流式 ICE（trickle ICE）</font>**<font style="color:rgb(0, 0, 0);">期间作为附加候选出现（即发生在主要信令之后、但连接验证阶段完成之前的额外候选交换）。</font>
+ `**<font style="color:rgb(0, 0, 0);">srflx</font>**`<font style="color:rgb(0, 0, 0);">：服务器反射候选（server reflexive candidate）由 </font>**<font style="color:rgb(0, 0, 0);">STUN/TURN</font>**<font style="color:rgb(0, 0, 0);"> 服务器生成；连接的发起方向 </font>**<font style="color:rgb(0, 0, 0);">STUN</font>**<font style="color:rgb(0, 0, 0);"> 服务器请求一个候选，该请求通过远端对等端的 </font>**<font style="color:rgb(0, 0, 0);">NAT</font>**<font style="color:rgb(0, 0, 0);"> 转发，该 </font>**<font style="color:rgb(0, 0, 0);">NAT</font>**<font style="color:rgb(0, 0, 0);"> 创建并返回一个其 </font>**<font style="color:rgb(0, 0, 0);">IP</font>**<font style="color:rgb(0, 0, 0);"> 地址在远端对等端本地有效的候选。然后，</font>**<font style="color:rgb(0, 0, 0);">STUN</font>**<font style="color:rgb(0, 0, 0);"> 服务器用一个与远端对等端无关的 </font>**<font style="color:rgb(0, 0, 0);">IP</font>**<font style="color:rgb(0, 0, 0);"> 地址的候选回复发起方的请求。</font>
+ `**<font style="color:rgb(0, 0, 0);">relay</font>**`<font style="color:rgb(0, 0, 0);">：中继候选（relay candidate）的生成方式与服务器反射候选（</font>`<font style="color:rgb(0, 0, 0);">srflx</font>`<font style="color:rgb(0, 0, 0);">）类似，但使用的是 </font>[**TURN**](https://developer.mozilla.org/en-US/docs/Glossary/TURN)<font style="color:rgb(0, 0, 0);"> 而不是 </font>[**STUN**](https://developer.mozilla.org/en-US/docs/Glossary/STUN)<font style="color:rgb(0, 0, 0);">。</font>

**<font style="color:rgb(0, 0, 0);"></font>**

#### <font style="color:rgb(0, 0, 0);">TCP 候选类型（TCP candidate types）</font>
<font style="color:rgb(0, 0, 0);">TCP 候选（即协议（</font>[protocol](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/protocol)<font style="color:rgb(0, 0, 0);">）为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">tcp</font>`<font style="color:rgb(0, 0, 0);">的候选）可以是以下类型：</font>

+ <font style="color:rgb(0, 0, 0);"></font>`**<font style="color:rgb(0, 0, 0);">active</font>**`<font style="color:rgb(0, 0, 0);">：传输将尝试建立一个出站连接，但不会接收传入的连接请求。这是最常见的类型，也是大多数用户代理（浏览器）会收集的唯一类型。</font>
+ <font style="color:rgb(0, 0, 0);"></font>`**<font style="color:rgb(0, 0, 0);">passive</font>**`<font style="color:rgb(0, 0, 0);">：传输将接收传入的连接尝试，但自身不会尝试建立连接。</font>
+ `**<font style="color:rgb(0, 0, 0);">so</font>**`<font style="color:rgb(0, 0, 0);">：传输将尝试与其对等端同时打开连接。</font>_<font style="color:rgb(0, 0, 0);">(注：RFC 6544 允许此类型，但实际实现中较少见)</font>_

**<font style="color:rgb(0, 0, 0);"></font>**

**<font style="color:rgb(0, 0, 0);"></font>**

#### <font style="color:rgb(0, 0, 0);">选择候选对（Choosing a candidate pair）</font>
**<font style="color:rgb(0, 0, 0);">ICE</font>**<font style="color:rgb(0, 0, 0);"> 层选择两个对等端中的一个作为 </font>**<font style="color:rgb(0, 0, 0);">控制代理（controlling agent）</font>**<font style="color:rgb(0, 0, 0);">。这个 </font>**<font style="color:rgb(0, 0, 0);">ICE agent</font>**<font style="color:rgb(0, 0, 0);"> 将最终决定使用哪个</font>**<font style="color:rgb(0, 0, 0);">候选对（candidate pair）</font>**<font style="color:rgb(0, 0, 0);">进行连接。另一个对等端被称为</font>**<font style="color:rgb(0, 0, 0);">受控代理（controlled agent）</font>**<font style="color:rgb(0, 0, 0);">。你可以通过检查</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCIceCandidate.transport.role</font>`<font style="color:rgb(0, 0, 0);">的值来确定你的连接端是哪种角色，但通常来说哪个是哪个并不重要。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">控制代理不仅负责最终决定使用哪个候选对，还负责在必要时使用 </font>**<font style="color:rgb(0, 0, 0);">STUN</font>**<font style="color:rgb(0, 0, 0);"> 和更新的 </font>**<font style="color:rgb(0, 0, 0);">Offer</font>**<font style="color:rgb(0, 0, 0);"> 将该选择通知受控代理。受控代理只是等待被告知要使用哪个候选对。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">需要记住的重要一点是，一个 </font>**<font style="color:rgb(0, 0, 0);">ICE</font>**<font style="color:rgb(0, 0, 0);"> 会话可能导致控制代理选择多个候选对。每次它这样做并与受控代理共享该信息时，两个对等端就会重新配置它们的连接以使用该新候选对所描述的新配置。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">一旦 </font>**<font style="color:rgb(0, 0, 0);">ICE</font>**<font style="color:rgb(0, 0, 0);"> 会话完成，当前生效的配置就是最终配置，除非发生 </font>**<font style="color:rgb(0, 0, 0);">ICE 重置（ICE reset）</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">在每个</font>**<font style="color:rgb(0, 0, 0);">候选代（generation of candidates）</font>**<font style="color:rgb(0, 0, 0);">结束时，会发送一个</font>**<font style="color:rgb(0, 0, 0);">候选结束通知（end-of-candidates notification）</font>**<font style="color:rgb(0, 0, 0);">，形式为一个 </font>`[candidate](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/candidate)`<font style="color:rgb(0, 0, 0);">属性为空字符串的 </font>`[<font style="color:rgb(0, 105, 194);">RTCIceCandidate</font>](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate)`<font style="color:rgb(0, 0, 0);">对象。这个候选仍然应该像往常一样使用 </font>`[addIceCandidate()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addIceCandidate)`<font style="color:rgb(0, 0, 0);">方法添加到连接中，以便将该通知传递给远端对等端。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">在当前协商交换期间完全不再有预期的候选时，会通过传递一个 </font>`[candidate](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/candidate)`<font style="color:rgb(0, 0, 0);">属性为 </font>`<font style="color:rgb(0, 0, 0);">null</font>`<font style="color:rgb(0, 0, 0);">的 </font>`[RTCIceCandidate](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate)`<font style="color:rgb(0, 0, 0);">来发送</font>**<font style="color:rgb(0, 0, 0);">候选结束通知（end-of-candidates notification）</font>**<font style="color:rgb(0, 0, 0);">。该消息不需要发送给远端对等端。它是一种旧式通知，可以通过监听 </font>`[iceGatheringState](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceGatheringState)`<font style="color:rgb(0, 0, 0);">变为 </font>`<font style="color:rgb(0, 0, 0);">complete</font>`<font style="color:rgb(0, 0, 0);">，或者监听 </font>`[icegatheringstatechange](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event)`<font style="color:rgb(0, 0, 0);">事件来检测该状态。</font>

**<font style="color:rgb(0, 0, 0);"></font>**

**<font style="color:rgb(0, 0, 0);"></font>**

### <font style="color:rgb(0, 0, 0);">当出现问题时（When things go wrong）</font>
<font style="color:rgb(0, 0, 0);">在协商过程中，有时事情可能不会顺利进行。例如，在重新协商一个连接时——比如为了适应变化的硬件或网络配置——协商可能会陷入僵局，或者可能出现某种形式的错误阻碍协商。同样也可能存在权限问题或其他问题。</font>

<font style="color:rgb(0, 0, 0);"></font>

**<font style="color:rgb(0, 0, 0);">ICE 回退（ICE rollbacks）</font>**

<font style="color:rgb(0, 0, 0);">当重新协商一个已经激活的连接时，如果遇到协商失败的情况，你通常并不希望中断正在进行的通话。毕竟，你很可能只是想升级或降级连接，或者对正在进行的会话进行适应性调整。在那时中止通话会是过度的反应。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">相反，你可以发起一个 </font>**<font style="color:rgb(0, 0, 0);">ICE 回退（ICE rollback）</font>**<font style="color:rgb(0, 0, 0);">。回退将 </font>**<font style="color:rgb(0, 0, 0);">SDP Offer</font>**<font style="color:rgb(0, 0, 0);">（以及由此扩展的连接配置）恢复到连接的信令状态（</font>`[signalingState](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/signalingState)`<font style="color:rgb(0, 0, 0);">）上次处于 </font>`**<font style="color:rgb(0, 0, 0);">stable</font>**`<font style="color:rgb(0, 0, 0);"> 时的配置。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">要以编程方式发起回退，需要发送一个</font><font style="color:rgb(0, 0, 0);"> </font>`[type](https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription/type)`<font style="color:rgb(0, 0, 0);">为 </font>`**<font style="color:rgb(0, 0, 0);">rollback</font>**`<font style="color:rgb(0, 0, 0);"> 的描述（description）。描述对象中的任何其他属性都会被忽略。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">此外，当先前创建过一个 </font>**<font style="color:rgb(0, 0, 0);">Offer</font>**<font style="color:rgb(0, 0, 0);"> 的对等端（local peer）从远端对等端（remote peer）收到一个 </font>**<font style="color:rgb(0, 0, 0);">Offer</font>**<font style="color:rgb(0, 0, 0);"> 时，</font>**<font style="color:rgb(0, 0, 0);">ICE agent</font>**<font style="color:rgb(0, 0, 0);"> 会自动发起回退。换句话说，如果本地对等端处于 </font>`**<font style="color:rgb(0, 0, 0);">have-local-offer</font>**`<font style="color:rgb(0, 0, 0);"> 状态（表示本地对等端之前发送过一个 </font>**<font style="color:rgb(0, 0, 0);">Offer</font>**<font style="color:rgb(0, 0, 0);">），此时调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">setRemoteDescription()</font>`<font style="color:rgb(0, 0, 0);">接收到一个远端 </font>**<font style="color:rgb(0, 0, 0);">Offer</font>**<font style="color:rgb(0, 0, 0);"> 将触发回退，使协商角色从远端为呼叫方（caller）切换回本地为呼叫方。</font>

<font style="color:rgba(0, 0, 0, 0.6);"></font>

### <font style="color:rgba(0, 0, 0, 0.6);">完整的交换流程</font>
![](https://cdn.nlark.com/yuque/0/2025/png/23201316/1755507741740-e35f1e48-d239-4563-a2af-71911b6c6bdf.png)





## **<font style="color:rgb(0, 0, 0);">建立连接：WebRTC 完美协商模式 (Establishing a connection: The WebRTC perfect negotiation pattern)</font>**
<font style="color:rgb(0, 0, 0);">由于</font>[ WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)<font style="color:rgb(0, 0, 0);"> 在协商新对等连接时没有规定特定的信令传输机制，因此它具有高度灵活性。然而，尽管信令消息的传输和通信具有灵活性，但在可能的情况下，仍然有一个你应该遵循的推荐设计模式，称为 </font>**<font style="color:rgb(0, 0, 0);">完美协商 (perfect negotiation)</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">在支持 WebRTC 的浏览器首次部署后，人们意识到对于典型用例而言，协商过程的某些部分比实际需要的更复杂。这是由于 API 存在的一些小问题和一些需要避免的潜在</font>**<font style="color:rgb(0, 0, 0);">竞争条件 (race conditions)</font>**<font style="color:rgb(0, 0, 0);">。这些问题后来得到了解决，使我们能够显著简化 WebRTC 协商。完美协商模式就是自 WebRTC 早期以来协商方式得以改进的例子之一。</font>

<font style="color:rgb(0, 0, 0);"></font>

### <font style="color:rgb(0, 0, 0);">完美协商概念 (Perfect negotiation concepts)</font>
**<font style="color:rgb(0, 0, 0);">完美协商使得协商过程能够无缝地、完全地与应用程序的其他逻辑分离。协商本质上是一个非对称操作：一方需要充当“呼叫方（caller）”，而另一方则作为“被呼叫方（callee）”</font>**<font style="color:rgb(0, 0, 0);">。完美协商模式通过将这种差异分离到独立的协商逻辑中来消除这种差异，这样你的应用程序就不需要关心它处于连接的哪一端。对你的应用程序来说，是向外呼叫还是接收呼叫没有区别。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">完美协商最棒的地方在于，呼叫方和被呼叫方使用相同的代码，因此无需编写重复或额外的协商代码层。</font>

<font style="color:rgb(0, 0, 0);">完美协商通过为两个对等端各自分配一个在协商过程中扮演的角色来实现，这个角色完全独立于 WebRTC 连接状态：</font>

+ <font style="color:rgb(0, 0, 0);"></font>**<font style="color:rgb(0, 0, 0);">礼貌端（Polite peer）</font>**<font style="color:rgb(0, 0, 0);">：使用 </font>**<font style="color:rgb(0, 0, 0);">ICE 回退 (ICE rollback)</font>**<font style="color:rgb(0, 0, 0);"> 来防止与传入的要约（offer）发生冲突。本质上，礼貌端可以发送要约（offers），但如果收到来自另一方的要约（尤其是在自己正准备发送或已发送要约时），它会响应：“好的，没关系，放弃我的要约，我考虑你的要约。”</font>
+ **<font style="color:rgb(0, 0, 0);">非礼貌端（Impolite peer）</font>**<font style="color:rgb(0, 0, 0);">：总是忽略与其自身要约冲突的传入要约。它从不道歉或向礼貌端让步。任何时候发生冲突，非礼貌端都会获胜。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">这样，两个对等端都确切知道在发送的要约发生冲突时应该如何处理。对错误条件的响应变得更加可预测。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">你如何决定哪个对等端是礼貌端，哪个是非礼貌端，通常取决于你自己。可以非常简单，例如将首先连接到</font>**<font style="color:rgb(0, 0, 0);">信令服务器（signaling server）</font>**<font style="color:rgb(0, 0, 0);">的对等端分配为礼貌端；或者你可以做得更精细一些，例如让对等端交换随机数，并将礼貌端角色分配给获胜者。无论你如何决定，一旦这两个角色被分配给对等端，它们就可以协同工作来管理信令，而不会发生死锁，也不需要大量额外代码来管理。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">需要牢记的一个重要点是：在完美协商过程中，</font>**<font style="color:rgb(0, 0, 0);">呼叫方（caller）</font>**<font style="color:rgb(0, 0, 0);"> 和 </font>**<font style="color:rgb(0, 0, 0);">被呼叫方（callee）</font>**<font style="color:rgb(0, 0, 0);"> 的角色可以切换。如果礼貌端是呼叫方并发送了一个要约（offer），但与非礼貌端的要约发生了冲突，礼貌端会放弃自己的要约，改为响应它从非礼貌端收到的要约。这样，礼貌端就</font>**<font style="color:rgb(0, 0, 0);">从呼叫方切换成了被呼叫方</font>**<font style="color:rgb(0, 0, 0);">！</font>



<font style="color:rgb(0, 0, 0);"></font>

### **<font style="color:rgb(0, 0, 0);">创建信令和对等连接 (Create the signaling and peer connections)</font>**
**<font style="color:rgb(0, 0, 0);">看一个实现完美协商模式的示例。该代码假设定义了一个 </font>**`**<font style="color:rgb(0, 0, 0);">SignalingChannel</font>**`**<font style="color:rgb(0, 0, 0);">类，用于与信令服务器通信。当然，你自己的代码可以使用你喜欢的任何信令技术。</font>**

_<font style="color:rgb(0, 0, 0);">注意：参与连接的</font>_<font style="color:rgb(0, 0, 0);">两个</font>_<font style="color:rgb(0, 0, 0);">对等端的这段代码是</font>_<font style="color:rgb(0, 0, 0);">完全相同</font>_<font style="color:rgb(0, 0, 0);">的。</font>_

_<font style="color:rgb(0, 0, 0);"></font>_

<font style="color:rgb(0, 0, 0);">首先，需要打开信令通道并创建 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">。这里列出的 STUN 服务器显然不是真实的；你需要将 </font>`<font style="color:rgb(0, 0, 0);">stun:stun.my-stun-server.tld</font>`<font style="color:rgb(0, 0, 0);">替换为真实的 STUN 服务器地址。</font>

```javascript
const config = {
  iceServers: [{ urls: "stun:stun.my-stun-server.tld" }],
};

const signaler = new SignalingChannel();
const pc = new RTCPeerConnection(config);
```

<font style="color:rgb(0, 0, 0);">此代码还使用类名 </font>`<font style="color:rgb(0, 0, 0);">"self-view"</font>`<font style="color:rgb(0, 0, 0);">和 </font>`<font style="color:rgb(0, 0, 0);">"remote-view"</font>`<font style="color:rgb(0, 0, 0);">获取了 </font>`[<video>](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video)`<font style="color:rgb(0, 0, 0);">元素；它们将分别包含本地用户的</font>**<font style="color:rgb(0, 0, 0);">自拍视图（self-view）</font>**<font style="color:rgb(0, 0, 0);">和来自远端对等端的传入流的视图。</font>

### <font style="color:rgb(0, 0, 0);">连接到远端对等端 (Connecting to a remote peer)</font>
```javascript
const constraints = { audio: true, video: true };
const selfVideo = document.querySelector("video.self-view");
const remoteVideo = document.querySelector("video.remote-view");

async function start() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream); // 将媒体轨道添加到对等连接
    }
    selfVideo.srcObject = stream; // 将自拍视图的源设置为本地流
  } catch (err) {
    console.error(err);
  }
}
```

<font style="color:rgb(0, 0, 0);">上面显示的 </font>`<font style="color:rgb(0, 0, 0);">start()</font>`<font style="color:rgb(0, 0, 0);">函数</font>**<font style="color:rgb(0, 0, 0);">可以被想要相互通信的两个端点中的任意一个调用</font>**<font style="color:rgb(0, 0, 0);">。谁先调用它并不重要；协商将会正常工作。</font>

<font style="color:rgb(0, 0, 0);">这与旧的 WebRTC 连接建立代码没有明显不同。通过调用 </font>`[getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)`<font style="color:rgb(0, 0, 0);">获取用户的摄像头和麦克风。然后，通过将它们传递给 </font>`[addTrack()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack)`<font style="color:rgb(0, 0, 0);">，将生成的媒体轨道添加到 </font>`[RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)`<font style="color:rgb(0, 0, 0);">中。最后，将 </font>`<font style="color:rgb(0, 0, 0);">selfVideo</font>`<font style="color:rgb(0, 0, 0);">常量指示的</font>**<font style="color:rgb(0, 0, 0);">自拍视图（self-view）</font>**`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素的媒体源设置为摄像头和麦克风流，允许本地用户看到另一方看到的内容。</font>

<font style="color:rgb(0, 0, 0);"></font>

### <font style="color:rgb(0, 0, 0);">处理传入轨道 (Handling incoming tracks)</font>
<font style="color:rgb(0, 0, 0);">接下来，我们需要为 </font>`<font style="color:rgb(0, 0, 0);">track</font>`<font style="color:rgb(0, 0, 0);">事件设置一个处理程序，以处理已协商好由本对等连接接收的入站音视频轨道。为此，我们实现 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">的 </font>`<font style="color:rgb(0, 0, 0);">ontrack</font>`<font style="color:rgb(0, 0, 0);">事件处理程序。</font>

```javascript
pc.ontrack = ({ track, streams }) => {
  track.onunmute = () => {
    if (remoteVideo.srcObject) {
      return; // 如果已有远端视频流，则直接返回
    }
    remoteVideo.srcObject = streams[0]; // 将远端视图的源设置为传入流的第一个流
  };
};
```



<font style="color:rgb(0, 0, 0);">当</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">track</font>`<font style="color:rgb(0, 0, 0);">事件发生时，执行此处理程序。使用解构，提取</font><font style="color:rgb(0, 0, 0);"> </font>`[RTCTrackEvent](https://developer.mozilla.org/en-US/docs/Web/API/RTCTrackEvent)`<font style="color:rgb(0, 0, 0);">的</font><font style="color:rgb(0, 0, 0);"> </font>`[track](https://developer.mozilla.org/en-US/docs/Web/API/RTCTrackEvent/track)`<font style="color:rgb(0, 0, 0);">和</font><font style="color:rgb(0, 0, 0);"> </font>`[streams](https://developer.mozilla.org/en-US/docs/Web/API/RTCTrackEvent/streams)`<font style="color:rgb(0, 0, 0);">属性。</font>`<font style="color:rgb(0, 0, 0);">track</font>`<font style="color:rgb(0, 0, 0);">是正在接收的视频轨道或音频轨道。</font>`<font style="color:rgb(0, 0, 0);">streams</font>`<font style="color:rgb(0, 0, 0);">是一个</font><font style="color:rgb(0, 0, 0);"> </font>`[MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)`<font style="color:rgb(0, 0, 0);">对象数组，每个对象代表一个包含此轨道的流（在极少数情况下，一个轨道可能同时属于多个流）。在我们的例子中，由于之前向</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">addTrack()</font>`<font style="color:rgb(0, 0, 0);">传递了一个流，这将始终包含一个流，在索引 0 处。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">我们在轨道上添加一个</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">unmute</font>`<font style="color:rgb(0, 0, 0);">事件处理程序，因为轨道在开始接收数据包时会变为</font>**<font style="color:rgb(0, 0, 0);">解除静音（unmuted）</font>**<font style="color:rgb(0, 0, 0);">。我们将接收代码的其余部分放在这里。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">如果远端对等端已经有视频传入（我们可以通过检查远端视图 </font>`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素的 </font>`<font style="color:rgb(0, 0, 0);">srcObject</font>`<font style="color:rgb(0, 0, 0);">属性是否已有值来判断），我们什么都不做。否则，将 </font>`[srcObject](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/srcObject)`<font style="color:rgb(0, 0, 0);">设置为 </font>`<font style="color:rgb(0, 0, 0);">streams</font>`<font style="color:rgb(0, 0, 0);">数组中索引 0 处的流。</font>

<font style="color:rgb(0, 0, 0);"></font>

### <font style="color:rgb(0, 0, 0);">完美协商逻辑 (The perfect negotiation logic)</font>
<font style="color:rgb(0, 0, 0);">现在，我们进入真正的完美协商逻辑，它完全独立于应用程序的其他部分运行。</font>

#### <font style="color:rgb(0, 0, 0);">处理 negotiationneeded 事件 (Handling the negotiationneeded event)</font>
<font style="color:rgb(0, 0, 0);">首先，我们实现 </font>`[RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)`<font style="color:rgb(0, 0, 0);">事件处理程序 </font>`[onnegotiationneeded](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/negotiationneeded_event)`<font style="color:rgb(0, 0, 0);">，以获取本地描述（local description）并通过信令通道将其发送给远端对等端。</font>

```javascript
let makingOffer = false; // 标记是否正在创建要约

pc.onnegotiationneeded = async () => {
  try {
    makingOffer = true; // 标记开始创建要约
    await pc.setLocalDescription(); // 自动创建并设置合适的描述（要约）
    signaler.send({ description: pc.localDescription }); // 发送本地描述
  } catch (err) {
    console.error(err);
  } finally {
    makingOffer = false; // 无论如何，清除标记
  }
};
```

<font style="color:rgb(0, 0, 0);">请注意，不带参数的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">setLocalDescription()</font>`<font style="color:rgb(0, 0, 0);">会根据当前的</font>**<font style="color:rgb(0, 0, 0);">信令状态 (</font>**[**signalingState**](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/signalingState)**<font style="color:rgb(0, 0, 0);">)</font>**<font style="color:rgb(0, 0, 0);"> 自动创建并设置合适的描述。所设置的描述要么是对最近来自远端对等端的要约（offer）的</font>**<font style="color:rgb(0, 0, 0);">应答 (answer)</font>**<font style="color:rgb(0, 0, 0);">，要么是如果没有正在进行协商则创建一个全新的要约（offer）。在这里，它</font>_<font style="color:rgb(0, 0, 0);">总是</font>_<font style="color:rgb(0, 0, 0);">一个要约（offer），因为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">negotiationneeded</font>`<font style="color:rgb(0, 0, 0);">事件仅在 </font>`**<font style="color:rgb(0, 0, 0);">stable</font>**`**<font style="color:rgb(0, 0, 0);">(稳定)</font>**<font style="color:rgb(0, 0, 0);"> 状态时触发。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">我们设置了一个布尔变量 </font>`<font style="color:rgb(0, 0, 0);">makingOffer</font>`<font style="color:rgb(0, 0, 0);">为 </font>`<font style="color:rgb(0, 0, 0);">true</font>`<font style="color:rgb(0, 0, 0);">，以标记我们正在准备一个要约（offer）。我们在调用 </font>`<font style="color:rgb(0, 0, 0);">setLocalDescription()</font>`_<font style="color:rgb(0, 0, 0);">之前</font>_<font style="color:rgb(0, 0, 0);">设置 </font>`<font style="color:rgb(0, 0, 0);">makingOffer</font>`<font style="color:rgb(0, 0, 0);">以锁定对发送此要约的干扰，并且直到要约成功发送到信令服务器（或发生错误，阻止了要约的创建）之后，才将其清除回 </font>`<font style="color:rgb(0, 0, 0);">false</font>`<font style="color:rgb(0, 0, 0);">。为了避免竞争，我们稍后将使用这个值而不是信令状态来判断要约是否正在处理中，因为 </font>`[signalingState](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/signalingState)`<font style="color:rgb(0, 0, 0);">的值是异步变化的，这会引入出站和入站呼叫（“要约冲突/glare”）的潜在冲突。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### **<font style="color:rgb(0, 0, 0);">处理传入的 ICE 候选 (Handling incoming ICE candidates)</font>**
<font style="color:rgb(0, 0, 0);">接下来，我们需要处理 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">事件 </font>[icecandidate](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event)<font style="color:rgb(0, 0, 0);">，这是本地 ICE 层向我们传递</font>**<font style="color:rgb(0, 0, 0);">候选 (candidate)</font>**<font style="color:rgb(0, 0, 0);"> 的方式，以便通过信令通道传输给远端对等端。</font>

```javascript
pc.onicecandidate = ({ candidate }) => signaler.send({ candidate });
```

<font style="color:rgb(0, 0, 0);">此代码获取此 ICE 事件的 </font>`<font style="color:rgb(0, 0, 0);">candidate</font>`<font style="color:rgb(0, 0, 0);">成员，并将其传递给信令通道的 </font>`<font style="color:rgb(0, 0, 0);">send()</font>`<font style="color:rgb(0, 0, 0);">方法，以通过信令服务器发送给远端对等端。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### **<font style="color:rgb(0, 0, 0);">处理信令通道上的传入消息 (Handling incoming messages on the signaling channel)</font>**
<font style="color:rgb(0, 0, 0);">拼图的最后一块是处理来自信令服务器传入消息的代码。这里将其实现为</font>**<font style="color:rgb(0, 0, 0);">信令通道对象</font>**<font style="color:rgb(0, 0, 0);">上的 </font>`<font style="color:rgb(0, 0, 0);">onmessage</font>`<font style="color:rgb(0, 0, 0);">事件处理程序。每当从信令服务器接收到消息时，就会调用此方法</font>

```javascript
let ignoreOffer = false; // 标记是否忽略当前要约及其候选
let isSettingRemoteAnswerPending = false; // 标记是否正在处理远程应答的描述设置

signaler.onmessage = async ({ data: { description, candidate } }) => {
  try {
    if (description) { // 如果收到描述 (SDP - Offer/Answer)
      // 检查当前状态是否准备好处理传入的要约
      const readyForOffer =
        !makingOffer && // 不在创建要约中
        (pc.signalingState === "stable" || // 信令状态为 stable (稳定)
          isSettingRemoteAnswerPending); // 或正在设置远程应答的过程中
      const offerCollision = description.type === "offer" && !readyForOffer; // 检测要约冲突

      ignoreOffer = !polite && offerCollision; // 非礼貌端在发生要约冲突时忽略该要约
      if (ignoreOffer) {
        return; // 忽略此要约及相关候选
      }

      // 标记是否正在设置一个远端应答的描述
      isSettingRemoteAnswerPending = description.type === "answer";

      // 应用远端描述 (Offer/Answer)
      await pc.setRemoteDescription(description);

      // 清除设置远程应答标记
      isSettingRemoteAnswerPending = false;

      // 如果收到的是一个要约 (Offer), 需要创建并发送一个应答 (Answer)
      if (description.type === "offer") {
        await pc.setLocalDescription(); // 自动创建并设置合适的应答描述
        signaler.send({ description: pc.localDescription }); // 发送本地描述 (Answer)
      }
    } else if (candidate) { // 如果收到 ICE 候选
      try {
        // 尝试将 ICE 候选添加到连接中
        await pc.addIceCandidate(candidate);
      } catch (err) {
        // 如果没有忽略最近的offer，则抛出错误；否则忽略添加候选失败的错误。
        if (!ignoreOffer) {
          throw err;
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
};
```

<font style="color:rgb(0, 0, 0);">当通过其</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">onmessage</font>`<font style="color:rgb(0, 0, 0);">事件处理程序从</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">SignalingChannel</font>`<font style="color:rgb(0, 0, 0);">接收到传入消息时，将解构接收到的 JSON 对象以获取其中的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">description</font>`<font style="color:rgb(0, 0, 0);">或</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">candidate</font>`<font style="color:rgb(0, 0, 0);">。如果传入消息具有</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">description</font>`<font style="color:rgb(0, 0, 0);">，则它是另一方发送的要约（offer）或应答（answer）。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">另一方面，如果消息有 </font>`<font style="color:rgb(0, 0, 0);">candidate</font>`<font style="color:rgb(0, 0, 0);">，则它是作为</font>**<font style="color:rgb(0, 0, 0);">滴流式 ICE（</font>**[**trickle ICE**](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/canTrickleIceCandidates)**<font style="color:rgb(0, 0, 0);">）</font>**<font style="color:rgb(0, 0, 0);">的一部分从远端对等端接收到的 </font>**<font style="color:rgb(0, 0, 0);">ICE 候选（ICE candidate）</font>**<font style="color:rgb(0, 0, 0);">。通过将其传递给 </font>`[addIceCandidate()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addIceCandidate)`<font style="color:rgb(0, 0, 0);">，该候选将被传输给本地 ICE 层。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### **<font style="color:rgb(0, 0, 0);">接收描述时 (On receiving a description)</font>**
<font style="color:rgb(0, 0, 0);">如果我们接收到一个描述（description），我们准备响应传入的要约（offer）或应答（answer）。首先，我们检查以确保我们处于可以接受要约的状态。如果连接的</font>**<font style="color:rgb(0, 0, 0);">信令状态（signalingState）</font>**<font style="color:rgb(0, 0, 0);"> 不是 </font>`**<font style="color:rgb(0, 0, 0);">stable</font>**`**<font style="color:rgb(0, 0, 0);">（稳定）</font>**<font style="color:rgb(0, 0, 0);">，或者我们的连接端已经启动了创建自己要约的过程，那么我们就需要注意</font>**<font style="color:rgb(0, 0, 0);">要约冲突（offer collision）</font>**<font style="color:rgb(0, 0, 0);">。</font>

+ <font style="color:rgb(0, 0, 0);">如果我们是</font>**<font style="color:rgb(0, 0, 0);">非礼貌端（impolite peer）</font>**<font style="color:rgb(0, 0, 0);">，并且收到了冲突的要约（colliding offer），我们在不设置该描述的情况下返回，并将 </font>`<font style="color:rgb(0, 0, 0);">ignoreOffer</font>`<font style="color:rgb(0, 0, 0);">设置为 </font>`<font style="color:rgb(0, 0, 0);">true</font>`<font style="color:rgb(0, 0, 0);">，以确保我们也忽略另一方可能发送给我们的、属于此要约的所有候选（candidates）。这样做避免了错误噪音，因为我们从未通知我们的连接端有关此要约的信息。</font>
+ <font style="color:rgb(0, 0, 0);">如果我们是</font>**<font style="color:rgb(0, 0, 0);">礼貌端（polite peer）</font>**<font style="color:rgb(0, 0, 0);">，并且收到了冲突的要约（colliding offer），我们不需要做任何特殊处理，因为现有的要约将在下一步自动回退（rollback）。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">确保我们</font>_<font style="color:rgb(0, 0, 0);">想要</font>_<font style="color:rgb(0, 0, 0);">接受该要约后，我们通过调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">setRemoteDescription()</font>`<font style="color:rgb(0, 0, 0);">将传入的要约设置为</font>**<font style="color:rgb(0, 0, 0);">远端描述（remote description）</font>**<font style="color:rgb(0, 0, 0);">。这让 WebRTC 知道另一方提议的配置是什么。</font>_<font style="color:rgb(0, 0, 0);">如果我们是礼貌端，我们将放弃自己的要约并接受这个新的要约。</font>_

_<font style="color:rgb(0, 0, 0);"></font>_

<font style="color:rgb(0, 0, 0);">如果新设置的远程描述是一个</font>**<font style="color:rgb(0, 0, 0);">要约（offer）</font>**<font style="color:rgb(0, 0, 0);">，我们要求 WebRTC 通过调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">方法</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">setLocalDescription()</font>`<font style="color:rgb(0, 0, 0);">（不带参数）来选择一个合适的本地配置。这会导致</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">setLocalDescription()</font>`<font style="color:rgb(0, 0, 0);">自动生成一个合适的 </font>**<font style="color:rgb(0, 0, 0);">应答（answer）</font>**<font style="color:rgb(0, 0, 0);"> 来响应接收到的要约（offer）。然后，我们通过信令通道将此应答（answer）发送回第一个对等端。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### <font style="color:rgb(0, 0, 0);">接收 ICE 候选时 (On receiving an ICE candidate)</font>
<font style="color:rgb(0, 0, 0);">另一方面，如果接收到的消息包含一个 </font>**<font style="color:rgb(0, 0, 0);">ICE 候选（ICE candidate）</font>**<font style="color:rgb(0, 0, 0);">，我们通过调用 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">方法 </font>`<font style="color:rgb(0, 0, 0);">addIceCandidate()</font>`<font style="color:rgb(0, 0, 0);">将其传输给本地 ICE 层。如果发生错误，并且我们已经忽略了最近的邀约（offer），那么我们也忽略尝试添加该候选时可能发生的任何错误（因为该候选属于我们忽略的要约）。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);"></font>

## **<font style="color:rgb(0, 0, 0);">WebRTC 会话的生命周期 (Lifetime of a WebRTC session)</font>**
<font style="color:rgb(0, 0, 0);">WebRTC 让开发者能够在浏览器应用程序中构建点对点（peer-to-peer）的任意数据、音频或视频通信——或其任意组合。在本文中，我们将探讨一个 WebRTC 会话的生命周期，从建立连接一直到在不再需要时关闭连接。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">本文不会深入探讨建立和处理 WebRTC 连接所涉及的实际 API 细节；它概述了整个过程，并提供了一些关于每个步骤为何必要的信息。有关实际代码示例及其分步解释，请参阅 </font><font style="color:rgb(75, 109, 157);">Signaling and video calling</font><font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

### <font style="color:rgb(0, 0, 0);">建立连接 (Establishing the connection)</font>
<font style="color:rgb(0, 0, 0);">互联网很大。真的很大。它是如此之大，以至于多年前，聪明的人们看到了它的规模、其迅猛的增长速度以及 32 位 IP 寻址系统的局限性，并意识到在可用的地址耗尽之前必须采取行动，于是他们开始着手设计一个新的 64 位寻址系统。但他们意识到完成过渡所需的时间将长于 32 位地址能够使用的时间，因此其他聪明人提出了一种方法，让多台计算机共享同一个 32 位 IP 地址。</font>**<font style="color:rgb(0, 0, 0);">网络地址转换 (Network Address Translation, NAT)</font>**<font style="color:rgb(0, 0, 0);"> 就是这样一种标准，它通过处理 LAN 内部设备的入站和出站数据路由来支持这种地址共享，所有这些设备共享一个 WAN（全局）IP 地址。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">对用户来说，问题在于互联网上的每台计算机不再必然拥有唯一的 IP 地址，而且实际上，每台设备的 IP 地址不仅可能因为从一个网络移动到另一个网络而改变，还可能因为其网络地址被 NAT 和/或 </font>**<font style="color:rgb(0, 0, 0);">DHCP</font>**<font style="color:rgb(0, 0, 0);"> 改变而改变。对于尝试进行点对点（P2P）网络开发的开发者来说，这引入了一个难题：如果没有每个用户设备的唯一标识符，就不可能立即自动地知道如何连接到互联网上的特定设备。即使你知道你想与之交谈的对象是谁，你也不一定能知道如何联系到他们，甚至不知道他们的地址是什么。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">这就好比试图通过贴上一个写有“Michelle”的标签，然后把包裹投进邮筒来邮寄给你的朋友 Michelle，而你却不知道她的地址。你需要查找她的地址并将其写在包裹上，否则她最后会纳闷为什么你又忘记了她的生日。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">这就是</font>**<font style="color:rgb(0, 0, 0);">信令 (signaling)</font>**<font style="color:rgb(0, 0, 0);"> 发挥作用的地方。</font>

#### <font style="color:rgb(0, 0, 0);">信令 (Signaling)</font>
<font style="color:rgb(0, 0, 0);">信令是在两个设备之间发送控制信息的过程，用于确定通信协议、通道、媒体编解码器和格式、数据传输方法以及任何必需的路由信息。关于 WebRTC 的信令过程，最重要的一点是：</font>**<font style="color:rgb(0, 0, 0);">它没有被包含在规范中定义</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">你可能会疑惑，为什么对于建立 WebRTC 连接如此基础的东西会被规范遗漏？答案很简单：由于两个设备无法直接相互联系，并且规范无法预测 WebRTC 的所有可能用例，因此让开发者选择合适的网络技术和消息传递协议更有意义。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">特别是，如果开发者已经有了一种连接两个设备的方法，那么要求他们仅仅为了 WebRTC 而必须使用另一个由规范定义的方法是没有意义的。由于 WebRTC 并非存在于真空中，很可能还有其他连接在发挥作用，因此，如果可以利用现有的通道，那么避免为信令添加额外的连接通道是合理的。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">为了交换信令信息，你可以选择通过 WebSocket 连接来回发送 JSON 对象，或者使用 XMPP 或 SIP（通过适当的通道），或者使用带有轮询（polling）的 HTTPS 上的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">fetch()</font>`<font style="color:rgb(0, 0, 0);">，或者你能想到的任何其他技术组合。你甚至可以使用电子邮件作为信令通道。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">值得注意的是，执行信令的通道甚至不需要通过网络。一个对等端可以输出一个数据对象，然后将其打印出来，通过物理方式（步行或信鸽）携带到另一个设备，在该设备上输入，然后该设备输出一个响应，再步行返回等等，直到 WebRTC 对等连接建立起来。这会有非常高的延迟，但确实可以做到。</font>

**<font style="color:rgb(0, 0, 0);"></font>**

**<font style="color:rgb(0, 0, 0);"></font>**

#### <font style="color:rgb(0, 0, 0);">信令期间交换的信息 (Information exchanged during signaling)</font>
<font style="color:rgb(0, 0, 0);">在信令过程中需要交换三种基本类型的信息：</font>

1. **<font style="color:rgb(0, 0, 0);">控制消息 (Control messages)</font>**<font style="color:rgb(0, 0, 0);">：用于设置、打开和关闭通信通道以及处理错误的消息。</font>
2. **<font style="color:rgb(0, 0, 0);">连接设置信息 (Connection setup information)</font>**<font style="color:rgb(0, 0, 0);">：对等端能够相互通信所需的 IP 地址和端口信息。</font>
3. **<font style="color:rgb(0, 0, 0);">媒体能力协商 (Media capability negotiation)</font>**<font style="color:rgb(0, 0, 0);">：对等端可以理解的编解码器和媒体数据格式是什么？在 WebRTC 会话开始之前，这些需要达成一致。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">只有在信令成功完成后，打开 WebRTC 对等连接的真实过程才能开始。</font>

<font style="color:rgb(0, 0, 0);">值得注意的是，</font>**<font style="color:rgb(0, 0, 0);">信令服务器实际上不需要理解或处理两个对等端在信令期间通过它交换的数据。信令服务器本质上是一个中继 (relay)：一个双方都连接到的公共点，知道他们的信令数据可以通过它传输。服务器不需要以任何方式响应这些信息</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### <font style="color:rgb(0, 0, 0);">信令过程 (The signaling process)</font>
<font style="color:rgb(0, 0, 0);">为了能够开始一个 WebRTC 会话，需要按顺序发生以下事情：</font>

1. <font style="color:rgb(0, 0, 0);"></font><font style="color:rgb(0, 0, 0);">每个对等端创建一个 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">对象，代表其 WebRTC 会话端。</font>
2. <font style="color:rgb(0, 0, 0);"></font><font style="color:rgb(0, 0, 0);">每个对等端为 </font>`<font style="color:rgb(0, 0, 0);">icecandidate</font>`<font style="color:rgb(0, 0, 0);">事件建立一个处理程序，该程序负责通过信令通道将这些</font>**<font style="color:rgb(0, 0, 0);">候选 (candidate)</font>**<font style="color:rgb(0, 0, 0);"> 发送给另一个对等端。</font>
3. <font style="color:rgb(0, 0, 0);"></font><font style="color:rgb(0, 0, 0);">每个对等端为 </font>`<font style="color:rgb(0, 0, 0);">track</font>`<font style="color:rgb(0, 0, 0);">事件建立一个处理程序，该事件在远端对等端向流中添加</font>**<font style="color:rgb(0, 0, 0);">轨道 (track)</font>**<font style="color:rgb(0, 0, 0);"> 时被触发。此代码应将轨道连接到其使用者（consumer），例如 </font>`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素。</font>
4. <font style="color:rgb(0, 0, 0);">呼叫方（caller）创建某种唯一的标识符或令牌，并与接收方（callee）共享，以便信令服务器上的代码可以识别它们之间的呼叫。该标识符的确切内容和形式由你自己决定。</font>
5. <font style="color:rgb(0, 0, 0);">每个对等端连接到一个约定好的信令服务器（例如，一个它们都知道如何交换消息的 WebSocket 服务器）。</font>
6. <font style="color:rgb(0, 0, 0);">每个对等端告诉信令服务器它们想要加入同一个 WebRTC 会话（由步骤 4 建立的令牌标识）。</font>
7. _<font style="color:rgb(0, 0, 0);">（描述、候选等 - 更多内容即将到来）</font>_<font style="color:rgb(0, 0, 0);">- 这里指的是后续交换 </font>**<font style="color:rgb(0, 0, 0);">SDP 描述 (Offer/Answer)</font>**<font style="color:rgb(0, 0, 0);">、</font>**<font style="color:rgb(0, 0, 0);">ICE 候选 (ICE candidates)</font>**<font style="color:rgb(0, 0, 0);"> 等协商信息。</font>

<font style="color:rgb(0, 0, 0);"></font>

### <font style="color:rgb(0, 0, 0);">ICE 重启 (ICE restart)</font>
<font style="color:rgb(0, 0, 0);">有时，在 WebRTC 会话的生命周期内，网络条件会发生变化。例如，其中一个用户可能从蜂窝网络切换到 Wi-Fi 网络，或者网络可能变得拥塞。发生这种情况时，</font>**<font style="color:rgb(0, 0, 0);">ICE 代理 (ICE agent)</font>**<font style="color:rgb(0, 0, 0);"> 可能会选择执行 </font>**<font style="color:rgb(0, 0, 0);">ICE 重启 (ICE restart)</font>**<font style="color:rgb(0, 0, 0);">。这是一个重新协商网络连接的过程，与最初的 </font>**<font style="color:rgb(0, 0, 0);">ICE 协商 (ICE negotiation)</font>**<font style="color:rgb(0, 0, 0);"> 方式完全相同，但有一个关键区别：媒体会继续通过</font>**<font style="color:rgb(0, 0, 0);">原始的网络连接</font>**<font style="color:rgb(0, 0, 0);">流动，直到新的连接建立并运行。然后媒体切换到新的网络连接，旧的连接被关闭。</font>

<font style="color:rgb(0, 0, 0);"></font>

_<font style="color:rgb(0, 0, 0);">注意：不同的浏览器支持在不同条件下触发 ICE 重启。例如，并非所有浏览器都会因网络拥塞而执行 ICE 重启。</font>_

_<font style="color:rgb(0, 0, 0);"></font>_

<font style="color:rgb(0, 0, 0);">下面关于处理失败 </font>[ICE 连接状态](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState)<font style="color:rgb(0, 0, 0);">的代码片段展示了如何可能重启连接。</font>

```javascript
pc.oniceconnectionstatechange = () => {
  if (pc.iceConnectionState === "failed") { // 如果 ICE 连接状态变为 "failed"
    pc.setConfiguration(restartConfig); // (可选) 应用重启配置
    pc.restartIce(); // 指示 ICE 层执行重启
  }
};
```

<font style="color:rgb(0, 0, 0);">代码首先调用</font><font style="color:rgb(0, 0, 0);"> </font>`[RTCPeerConnection.setConfiguration()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setConfiguration)`<font style="color:rgb(0, 0, 0);">，传入一个更新的配置对象（</font>`<font style="color:rgb(0, 0, 0);">restartConfig</font>`<font style="color:rgb(0, 0, 0);">）。如果你需要以某种方式更改连接配置（例如，切换到另一组 ICE 服务器），则应在重启 ICE</font><font style="color:rgb(0, 0, 0);"> </font>_<font style="color:rgb(0, 0, 0);">之前</font>_<font style="color:rgb(0, 0, 0);">完成此操作。</font>

<font style="color:rgb(0, 0, 0);">然后处理程序调用</font><font style="color:rgb(0, 0, 0);"> </font>`[RTCPeerConnection.restartIce()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/restartIce)`<font style="color:rgb(0, 0, 0);">。这会告诉 </font>**<font style="color:rgb(0, 0, 0);">ICE 层 (ICE layer)</font>**<font style="color:rgb(0, 0, 0);"> 在下一个</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">createOffer()</font>`<font style="color:rgb(0, 0, 0);">调用中自动添加</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">iceRestart</font>`<font style="color:rgb(0, 0, 0);">标志，从而触发 ICE 重启。它还会为 </font>**<font style="color:rgb(0, 0, 0);">ICE 用户名片段 (ICE username fragment, ufrag)</font>**<font style="color:rgb(0, 0, 0);"> 和</font>**<font style="color:rgb(0, 0, 0);">密码 (password)</font>**<font style="color:rgb(0, 0, 0);"> 创建新的值，这些值将用于重新协商过程及最终形成的连接。</font>

<font style="color:rgb(0, 0, 0);">当检测到 </font>**<font style="color:rgb(0, 0, 0);">ICE ufrag</font>**<font style="color:rgb(0, 0, 0);"> 和 </font>**<font style="color:rgb(0, 0, 0);">ICE password</font>**<font style="color:rgb(0, 0, 0);"> 有新的值时，连接的</font>**<font style="color:rgb(0, 0, 0);">应答方 (answerer)</font>**<font style="color:rgb(0, 0, 0);"> 端会自动开始 ICE 重启。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);"></font>

## **<font style="color:rgb(0, 0, 0);">信令 (Signaling) 与视频通话 (Video Calling)</font>**
<font style="color:rgb(0, 0, 0);">WebRTC 允许在两个设备之间进行实时、点对点 (peer-to-peer) 的媒体交换。连接通过一个称为</font>**<font style="color:rgb(0, 0, 0);">信令 (signaling)</font>**<font style="color:rgb(0, 0, 0);"> 的发现和协商过程建立。本教程将指导您构建一个双向视频通话。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">WebRTC 是一种用于实时交换音频、视频和数据的纯点对点技术，但有一个重要的前提条件：为了让两个位于不同网络上的设备能够发现彼此，必须进行某种形式的发现和媒体格式协商（如其他文章所述）。这个过程称为</font>**<font style="color:rgb(0, 0, 0);">信令 (signaling)</font>**<font style="color:rgb(0, 0, 0);">，它涉及两个设备连接到第三个双方都约定的</font>**<font style="color:rgb(0, 0, 0);">服务器 (server)</font>**<font style="color:rgb(0, 0, 0);">。通过这个第三方服务器，两个设备可以定位彼此并交换</font>**<font style="color:rgb(0, 0, 0);">协商 (negotiation)</font>**<font style="color:rgb(0, 0, 0);"> 消息。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">在本文中，我们将进一步增强以支持在用户之间打开双向视频通话。您也可以在 [</font>[Render](https://webrtc-from-chat.onrender.com/)<font style="color:rgb(0, 0, 0);">] 上尝试此示例进行实验。您还可以在 [GitHub] 上查看</font>[完整项目](https://github.com/bsmth/examples/tree/main/webrtc-from-chat)<font style="color:rgb(0, 0, 0);">。</font>

---

### <font style="color:rgb(0, 0, 0);">信令服务器 (Signaling Server)</font>
<font style="color:rgb(0, 0, 0);">在两个设备之间建立 WebRTC 连接需要使用</font>**<font style="color:rgb(0, 0, 0);">信令服务器 (signaling server)</font>**<font style="color:rgb(0, 0, 0);"> 来解析如何通过互联网连接它们。信令服务器的工作是作为中介，让两个对等端 (peers) 发现并建立连接，同时尽可能减少潜在</font>**<font style="color:rgb(0, 0, 0);">私有信息 (private information)</font>**<font style="color:rgb(0, 0, 0);"> 的暴露。我们如何创建这个服务器，信令过程实际是如何工作的？</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">首先我们需要信令服务器本身。WebRTC 没有规定信令信息的传输机制。您可以使用任何您喜欢的方式，从 WebSocket 到 fetch()，甚至信鸽传输 (carrier pigeons)，在对等端之间交换信令信息。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">重要的是要注意，服务器不需要理解或解释</font>**<font style="color:rgb(0, 0, 0);">信令数据 (signaling data)</font>**<font style="color:rgb(0, 0, 0);"> 的内容。尽管它是</font>[ **SDP**](https://developer.mozilla.org/en-US/docs/Glossary/SDP)<font style="color:rgb(0, 0, 0);">，但这本身也不太重要：流经信令服务器的消息内容实际上是一个</font>**<font style="color:rgb(0, 0, 0);">黑盒 (black box)</font>**<font style="color:rgb(0, 0, 0);">。真正重要的是当</font>[ **ICE**](https://developer.mozilla.org/en-US/docs/Glossary/ICE)**<font style="color:rgb(0, 0, 0);"> 子系统 (ICE subsystem)</font>**<font style="color:rgb(0, 0, 0);"> 指示您将信令数据发送给另一个对等端时，您要照做，并且对方知道如何接收此信息并将其传递给其自身的 ICE 子系统。您所要做的就是在两者之间传递信息。内容对信令服务器本身来说</font>**<font style="color:rgb(0, 0, 0);">根本无关紧要 (does not matter at all)</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### <font style="color:rgb(0, 0, 0);">为信令准备好聊天服务器 (Readying the chat server for signaling)</font>
<font style="color:rgb(0, 0, 0);">我们的</font>[聊天服务器](https://github.com/mdn/samples-server/tree/master/s/websocket-chat)<font style="color:rgb(0, 0, 0);">使用 </font>**<font style="color:rgb(0, 0, 0);">WebSocket API</font>**<font style="color:rgb(0, 0, 0);"> 在客户端和服务器之间以 JSON 字符串形式发送信息。该服务器支持多种消息类型来处理任务，例如注册新用户、设置用户名和发送公共聊天消息。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">为了使服务器支持信令和 </font>**<font style="color:rgb(0, 0, 0);">ICE 协商 (ICE negotiation)</font>**<font style="color:rgb(0, 0, 0);">，我们需要更新代码。我们必须允许将消息定向到特定用户而不是广播给所有连接的用户，并确保无法识别的消息类型能够透传和送达，而服务器无需知道它们是什么。这让我们可以使用同一个服务器发送信令消息，而无需单独的服务器。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">让我们看看需要对聊天服务器进行哪些更改以支持 WebRTC 信令。这部分代码在文件</font>`[chatserver.js](https://github.com/bsmth/examples/blob/main/webrtc-from-chat/chat-server.js)`<font style="color:rgb(0, 0, 0);">中。</font>

<font style="color:rgb(0, 0, 0);">首先增加了函数 </font>`<font style="color:rgb(0, 0, 0);">sendToOneUser()</font>`<font style="color:rgb(0, 0, 0);">。顾名思义，它向特定的用户名发送一个字符串化的 JSON 消息。</font>

```javascript
function sendToOneUser(target, msgString) {
  connectionArray.find((conn) => conn.username === target).send(msgString);
}
```

<font style="color:rgb(0, 0, 0);">该函数遍历已连接用户列表，直到找到匹配指定用户名的用户，然后将消息发送给该用户。参数</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">msgString</font>`<font style="color:rgb(0, 0, 0);">是一个字符串化的 JSON 对象。本可以使其接收原始的消息对象，但在本例中这样更高效。由于消息已被字符串化，我们可以直接发送，无需进一步处理。</font>`<font style="color:rgb(0, 0, 0);">connectionArray</font>`<font style="color:rgb(0, 0, 0);">中的每个条目都是一个 </font>**<font style="color:rgb(0, 0, 0);">WebSocket 对象 (WebSocket object)</font>**<font style="color:rgb(0, 0, 0);">，因此我们可以直接调用其</font><font style="color:rgb(0, 0, 0);"> </font>`[send()](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send)`<font style="color:rgb(0, 0, 0);">方法。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">我们原始的聊天演示不支持向特定用户发送消息。下一个任务是更新主 WebSocket 消息处理程序以支持此功能。这涉及到在 "connection" 消息处理程序末尾附近的更改：</font>

```javascript
if (sendToClients) {
  const msgString = JSON.stringify(msg);

  if (msg.target && msg.target.length !== 0) {
    sendToOneUser(msg.target, msgString);
  } else {
    for (const connection of connectionArray) {
      connection.send(msgString);
    }
  }
}
```

<font style="color:rgb(0, 0, 0);">此代码现在查看待处理消息，检查它是否具有</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">target</font>`<font style="color:rgb(0, 0, 0);">属性。如果该属性存在，它会指定消息接收客户端的用户名，我们调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">sendToOneUser()</font>`<font style="color:rgb(0, 0, 0);">将消息发送给他们。否则，消息通过遍历连接列表广播给所有用户，向每个用户发送消息。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">由于现有代码允许发送任意消息类型，因此不需要进行额外的更改。我们的客户端现在可以向任何特定用户发送未知类型的消息，使他们能够根据需要交换信令消息。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">这就是我们需要在服务器端做的所有更改。现在让我们考虑我们将要实现的</font>**<font style="color:rgb(0, 0, 0);">信令协议 (signaling protocol)</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### <font style="color:rgb(0, 0, 0);">设计信令协议 (Designing the signaling protocol)</font>
<font style="color:rgb(0, 0, 0);">既然我们已经构建了一个交换消息的机制，就需要一个定义这些消息外观的协议。这可以通过多种方式完成；这里演示的只是组织信令消息的一种可能方式。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">本示例的服务器使用字符串化的 JSON 对象与其客户端进行通信。这意味着我们的信令消息将是 JSON 格式，内容指定了它们是什么类型的消息以及正确处理这些消息所需的任何附加信息。</font>

#### <font style="color:rgb(0, 0, 0);">交换会话描述 (Exchanging session descriptions)</font>
<font style="color:rgb(0, 0, 0);">启动信令过程时，由发起呼叫的用户创建一个</font>**<font style="color:rgb(0, 0, 0);">提议 (offer)</font>**<font style="color:rgb(0, 0, 0);">。此提议包括一个 </font>**<font style="color:rgb(0, 0, 0);">SDP 格式 (SDP format)</font>**<font style="color:rgb(0, 0, 0);"> 的</font>**<font style="color:rgb(0, 0, 0);">会话描述 (session description)</font>**<font style="color:rgb(0, 0, 0);">，需要传送到接收用户（我们称之为被叫方，callee）。被叫方通过包含 SDP 描述的</font>**<font style="color:rgb(0, 0, 0);">应答 (answer)</font>**<font style="color:rgb(0, 0, 0);"> 消息来回应提议。我们的信令服务器将使用 </font>**<font style="color:rgb(0, 0, 0);">WebSocket</font>**<font style="color:rgb(0, 0, 0);"> 传输类型为 "video-offer" 的提议消息和类型为 "video-answer" 的应答消息。这些消息具有以下字段：</font>

+ <font style="color:rgb(0, 0, 0);"></font>**<font style="color:rgb(0, 0, 0);">type</font>**<font style="color:rgb(0, 0, 0);">: 消息类型；要么是 "video-offer" 要么是 "video-answer"。</font>
+ <font style="color:rgb(0, 0, 0);"></font>**<font style="color:rgb(0, 0, 0);">name</font>**<font style="color:rgb(0, 0, 0);">: 发送者的用户名。</font>
+ <font style="color:rgb(0, 0, 0);"></font>**<font style="color:rgb(0, 0, 0);">target</font>**<font style="color:rgb(0, 0, 0);">: 接收描述的用户名（如果是呼叫方发送消息，则指定被叫方，反之亦然）。</font>
+ **<font style="color:rgb(0, 0, 0);">sdp</font>**<font style="color:rgb(0, 0, 0);">: 描述发送方视角下连接本端（或接收方视角下连接远端）的 </font>**<font style="color:rgb(0, 0, 0);">SDP (Session Description Protocol)</font>**<font style="color:rgb(0, 0, 0);"> 字符串。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">此时，两个参与者知道了本次通话要使用的</font>**<font style="color:rgb(0, 0, 0);">编解码器 (</font>**[**codecs**](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/WebRTC_codecs)**<font style="color:rgb(0, 0, 0);">)</font>**<font style="color:rgb(0, 0, 0);"> 和</font>**<font style="color:rgb(0, 0, 0);">编解码器参数 (</font>**[**codec parameters**](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/codecs_parameter)**<font style="color:rgb(0, 0, 0);">)</font>**<font style="color:rgb(0, 0, 0);">。然而，</font>**<font style="color:rgb(0, 0, 0);">他们仍然不知道如何传输媒体数据本身</font>**<font style="color:rgb(0, 0, 0);">。这就是</font>**<font style="color:rgb(0, 0, 0);">交互式连接建立 (</font>**[**Interactive Connectivity Establishment**](https://developer.mozilla.org/en-US/docs/Glossary/ICE)**<font style="color:rgb(0, 0, 0);"> - ICE)</font>**<font style="color:rgb(0, 0, 0);"> 发挥作用的地方。</font>

<font style="color:rgb(0, 0, 0);"> </font>

#### <font style="color:rgb(0, 0, 0);">交换 ICE 候选项 (Exchanging ICE candidates)</font>


<font style="color:rgb(0, 0, 0);">两个对等端需要交换 </font>**<font style="color:rgb(0, 0, 0);">ICE 候选项 (ICE candidates)</font>**<font style="color:rgb(0, 0, 0);"> 来协商它们之间的实际连接。每个 ICE 候选描述了一个发送端能够使用的通信方法。每个对等端按发现的顺序发送候选，即使媒体已经开始传输，它们也会持续发送候选，直到建议穷尽。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">在调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">pc.setLocalDescription(offer)</font>`<font style="color:rgb(0, 0, 0);">设置本地描述后，会向 </font>[**RTCPeerConnection**](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)<font style="color:rgb(0, 0, 0);"> 发送一个</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">icecandidate</font>`<font style="color:rgb(0, 0, 0);">事件以完成添加本地描述的过程。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">一旦两个对等端就一个相互兼容的候选项达成一致，该候选项的 </font>**<font style="color:rgb(0, 0, 0);">SDP</font>**<font style="color:rgb(0, 0, 0);"> 将被每个对等端用来构建并打开一个连接，</font>**<font style="color:rgb(0, 0, 0);">媒体 (media)</font>**<font style="color:rgb(0, 0, 0);"> 通过此连接开始传输。如果他们后来商定了一个更好（通常是更高性能）的候选项，流媒体可能会根据需要更改格式。（目前不支持此功能）理论上，在媒体已经开始传输后接收到的候选也可能用于在需要时降级到低带宽连接。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">每个 </font>**<font style="color:rgb(0, 0, 0);">ICE 候选</font>**<font style="color:rgb(0, 0, 0);">通过信令服务器以 JSON 消息的形式发送给另一个对等端，消息类型为 "new-ice-candidate"。每个候选消息包含以下字段：</font>

+ <font style="color:rgb(0, 0, 0);"></font>**<font style="color:rgb(0, 0, 0);">type</font>**<font style="color:rgb(0, 0, 0);">: 消息类型："new-ice-candidate"。</font>
+ <font style="color:rgb(0, 0, 0);"></font>**<font style="color:rgb(0, 0, 0);">target</font>**<font style="color:rgb(0, 0, 0);">: 正在进行协商的用户的用户名；服务器会将消息仅定向给此用户。</font>
+ **<font style="color:rgb(0, 0, 0);">candidate</font>**<font style="color:rgb(0, 0, 0);">: </font>**<font style="color:rgb(0, 0, 0);">SDP 候选字符串 (SDP candidate string)</font>**<font style="color:rgb(0, 0, 0);">，描述提议的连接方法。您通常不需要查看此字符串的内容。您的代码需要做的就是通过信令服务器将其路由到远程对等端。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">每个 ICE 消息建议一种通信协议（TCP 或 UDP）、IP 地址、端口号、连接类型（例如，指定的 IP 是对等端自身还是中继服务器），以及连接两台计算机所需的其他信息。这包括 NAT 或其他网络复杂性。</font>

<font style="color:rgb(0, 0, 0);"></font>

> **<font style="color:rgba(0, 0, 0, 0.4);">重要提示：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 需要注意的关键点是：在 ICE 协商期间，您的代码唯一负责的是：当您的 </font>`[onicecandidate](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event)`<font style="color:rgba(0, 0, 0, 0.4);">处理程序执行时，从 </font>**<font style="color:rgba(0, 0, 0, 0.4);">ICE 层</font>**<font style="color:rgba(0, 0, 0, 0.4);">接收传出的候选并通过信令连接将它们发送给另一个对等端，以及从信令服务器接收 ICE 候选消息（当接收到 "new-ice-candidate" 消息时），并通过调用 </font>`[RTCPeerConnection.addIceCandidate()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addIceCandidate)`<font style="color:rgba(0, 0, 0, 0.4);">将它们递送给您的 ICE 层。仅此而已。</font>
>

> <font style="color:rgba(0, 0, 0, 0.4);">在几乎所有情况下，</font>**<font style="color:rgba(0, 0, 0, 0.4);">SDP</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 的内容对您来说都是</font>**<font style="color:rgba(0, 0, 0, 0.4);">无关紧要的 (irrelevant)</font>**<font style="color:rgba(0, 0, 0, 0.4);">。尽量避免将其复杂化，除非您真正知道自己在做什么。否则只会走向疯狂。</font>
>

<font style="color:rgba(0, 0, 0, 0.4);"></font>

<font style="color:rgb(0, 0, 0);">您的信令服务器现在需要做的就是发送被要求发送的消息。您的工作流程可能还需要登录/身份验证功能，但此类细节会有所不同。</font>



> **<font style="color:rgba(0, 0, 0, 0.4);">重要提示：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> </font>`[onicecandidate](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event)`**<font style="color:rgba(0, 0, 0, 0.4);">事件 (Event)</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 和 </font>`[createAnswer()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer)`**<font style="color:rgba(0, 0, 0, 0.4);">Promise</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 都是</font>**<font style="color:rgba(0, 0, 0, 0.4);">异步调用 (async calls)</font>**<font style="color:rgba(0, 0, 0, 0.4);">，它们是单独处理的。确保您的信令不会改变顺序！例如，必须在调用 </font>`[setRemoteDescription()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription)`<font style="color:rgba(0, 0, 0, 0.4);">设置应答之后，才能调用 </font>`[addIceCandidate()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addIceCandidate)`<font style="color:rgba(0, 0, 0, 0.4);">传入服务器的 ice 候选项。</font>
>





#### <font style="color:rgb(0, 0, 0);">信令事务流 (Signaling transaction flow)</font>
**<font style="color:rgb(0, 0, 0);">信令 (signaling)</font>**<font style="color:rgb(0, 0, 0);"> 过程涉及两个</font>**<font style="color:rgb(0, 0, 0);">对等端 (peers)</font>**<font style="color:rgb(0, 0, 0);"> 使用中介——</font>**<font style="color:rgb(0, 0, 0);">信令服务器 (signaling server)</font>**<font style="color:rgb(0, 0, 0);"> ——进行消息交换。当然，具体过程会有所不同，但通常有几个处理</font>**<font style="color:rgb(0, 0, 0);">信令消息 (signaling messages)</font>**<font style="color:rgb(0, 0, 0);"> 的关键点：</font>

+ <font style="color:rgb(0, 0, 0);">运行在</font>**<font style="color:rgb(0, 0, 0);">网络浏览器 (web browser)</font>**<font style="color:rgb(0, 0, 0);"> 中的每个用户的</font>**<font style="color:rgb(0, 0, 0);">客户端 (client)</font>**
+ <font style="color:rgb(0, 0, 0);">每个用户的网络浏览器</font>
+ <font style="color:rgb(0, 0, 0);">信令服务器</font>
+ <font style="color:rgb(0, 0, 0);">托管</font>**<font style="color:rgb(0, 0, 0);">聊天服务 (chat service)</font>**<font style="color:rgb(0, 0, 0);"> 的</font>**<font style="color:rgb(0, 0, 0);">网络服务器 (web server)</font>**

<font style="color:rgb(0, 0, 0);">想象 Naomi 和 Priya 正在使用该聊天软件进行讨论，Naomi 决定在两人之间打开一个</font>**<font style="color:rgb(0, 0, 0);">视频通话 (video call)</font>**<font style="color:rgb(0, 0, 0);">。以下是预期的事件序列：</font>

![](https://cdn.nlark.com/yuque/0/2025/svg/23201316/1755595205676-87191e01-414e-42c5-b387-2f15f6d9b648.svg)





#### <font style="color:rgb(0, 0, 0);">ICE 候选项交换过程 (ICE candidate exchange process)</font>
<font style="color:rgb(0, 0, 0);">当每个对等端的 </font>**<font style="color:rgb(0, 0, 0);">ICE 层 (ICE layer)</font>**<font style="color:rgb(0, 0, 0);"> 开始发送</font>**<font style="color:rgb(0, 0, 0);">候选项 (candidates)</font>**<font style="color:rgb(0, 0, 0);"> 时，它会进入链中各个点之间的交换过程，该过程如下图所示：</font>

![](https://cdn.nlark.com/yuque/0/2025/svg/23201316/1755595985609-7b31abfc-5cc9-45d1-9c6b-8234705171ba.svg)



<font style="color:rgb(0, 0, 0);">每一方在从其本地 ICE 层收到候选项时，就会将它们发送给对方；没有轮流或分批发送候选项。一旦两个对等端在双方都能用于交换媒体的</font>**<font style="color:rgb(0, 0, 0);">一个候选项 (one candidate)</font>**<font style="color:rgb(0, 0, 0);"> 上达成一致，</font>**<font style="color:rgb(0, 0, 0);">媒体 (media)</font>**<font style="color:rgb(0, 0, 0);"> 就开始流动。即使媒体已经开始流动，每个对等端也会继续发送候选项，直到其选项耗尽。这样做的目的是希望找到比最初选定的选项</font>**<font style="color:rgb(0, 0, 0);">更好的选项 (better options)</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">如果条件发生变化（例如，网络连接恶化），一个或两个对等端可能会建议切换到</font>**<font style="color:rgb(0, 0, 0);">更低带宽的媒体分辨率 (lower-bandwidth media resolution)</font>**<font style="color:rgb(0, 0, 0);">，或使用</font>**<font style="color:rgb(0, 0, 0);">替代编解码器 (alternative codec)</font>**<font style="color:rgb(0, 0, 0);">。这会触发一轮新的候选项交换，之后可能会发生另一次媒体格式和/或编解码器变更。在指南 [WebRTC 使用的编解码器] 中，您可以了解 WebRTC 要求浏览器支持哪些</font>**<font style="color:rgb(0, 0, 0);">编解码器 (</font>**[**codecs**](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/WebRTC_codecs)**<font style="color:rgb(0, 0, 0);">)</font>**<font style="color:rgb(0, 0, 0);">，哪些浏览器支持哪些额外的编解码器，以及如何选择要使用的最佳编解码器。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">（可选）如果您想更深入地了解该过程在 ICE 层内部是如何完成的，请参阅 [</font>[RFC 8445](https://datatracker.ietf.org/doc/html/rfc8445)<font style="color:rgb(0, 0, 0);">: 交互式连接建立（Interactive Connectivity Establishment）] 第 </font>[2.3](https://datatracker.ietf.org/doc/html/rfc5245#section-2.3)<font style="color:rgb(0, 0, 0);"> 节（“协商候选项对并结束 ICE（Negotiating Candidate Pairs and Concluding ICE）”）。您应该注意到，一旦 ICE 层</font>**<font style="color:rgb(0, 0, 0);">认为条件满足 (is satisfied)</font>**<font style="color:rgb(0, 0, 0);">，候选项就被交换并且媒体开始流动。所有这一切都是在幕后处理的。我们的角色是通过</font>**<font style="color:rgb(0, 0, 0);">信令服务器 (signaling server)</font>**<font style="color:rgb(0, 0, 0);"> 来回发送这些候选项。</font>

<font style="color:rgb(0, 0, 0);"></font>

### <font style="color:rgb(0, 0, 0);">客户端应用程序 (The client application)</font>
<font style="color:rgb(0, 0, 0);">任何</font>**<font style="color:rgb(0, 0, 0);">信令过程 (signaling process)</font>**<font style="color:rgb(0, 0, 0);"> 的核心都是其</font>**<font style="color:rgb(0, 0, 0);">消息处理 (message handling)</font>**<font style="color:rgb(0, 0, 0);">。虽然不必使用 </font>**<font style="color:rgb(0, 0, 0);">WebSockets</font>**<font style="color:rgb(0, 0, 0);"> 进行信令，但这是一个常见的解决方案。当然，您应该为您的应用程序选择一种合适的交换信令信息的机制。</font>

<font style="color:rgb(0, 0, 0);">让我们更新聊天客户端以支持视频通话。</font>

#### <font style="color:rgb(0, 0, 0);">更新 HTML (Updating the HTML)</font>
<font style="color:rgb(0, 0, 0);">我们的客户端 HTML 需要一个呈现视频的位置。这需要 </font>**<font style="color:rgb(0, 0, 0);">video 元素 (video elements)</font>**<font style="color:rgb(0, 0, 0);"> 和一个用于挂断通话的按钮：</font>

```html
<div class="flexChild" id="camera-container">
  <div class="camera-box">
    <video id="received_video" autoplay></video>
    <video id="local_video" autoplay muted></video>
    <button id="hangup-button" disabled>Hang Up</button>
  </div>
</div>
```

```javascript
document.getElementById("hangup-button").addEventListener("click", hangUpCall);
```

<font style="color:rgb(0, 0, 0);">这里定义的页面结构使用了</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><div></font>`<font style="color:rgb(0, 0, 0);">元素，使我们能够通过使用 </font>**<font style="color:rgb(0, 0, 0);">CSS</font>**<font style="color:rgb(0, 0, 0);"> 完全控制页面布局。我们将在本指南中跳过布局细节，但请查看 [GitHub] 上的 CSS 以了解我们如何处理它。注意两个</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素（一个用于自拍视图，一个用于连接）和</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><button></font>`<font style="color:rgb(0, 0, 0);">元素。</font>

<font style="color:rgb(0, 0, 0);"></font>

`<font style="color:rgb(0, 0, 0);">id</font>`<font style="color:rgb(0, 0, 0);">为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">received_video</font>`<font style="color:rgb(0, 0, 0);">的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素将呈现从连接用户接收的视频。我们指定了</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">autoplay</font>`**<font style="color:rgb(0, 0, 0);">属性 (attribute)</font>**<font style="color:rgb(0, 0, 0);">，确保视频一旦开始到达就立即播放。这消除了在代码中显式处理播放的需要。</font>`<font style="color:rgb(0, 0, 0);">local_video</font>``<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素呈现用户摄像头的预览；指定了</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">muted</font>`<font style="color:rgb(0, 0, 0);">属性，因为我们不需要在此预览面板中听到本地音频。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">最后，定义了用于断开通话的 </font>`<font style="color:rgb(0, 0, 0);">hangup-button</font>``<font style="color:rgb(0, 0, 0);"><button></font>`<font style="color:rgb(0, 0, 0);">，并将其配置为初始禁用（设置为无通话连接时的默认状态），并在点击时应用 </font>`<font style="color:rgb(0, 0, 0);">hangUpCall()</font>`<font style="color:rgb(0, 0, 0);">函数。此函数的作用是关闭通话，并向另一个对等端发送信令服务器通知，请求其也关闭。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### <font style="color:rgb(0, 0, 0);">JavaScript 代码 (The JavaScript code)</font>
<font style="color:rgb(0, 0, 0);">我们将这段代码划分为功能区域，以便更轻松地描述其工作原理。此代码的主体位于</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">connect()</font>`<font style="color:rgb(0, 0, 0);">函数中：它在端口 6503 上打开一个 </font>**<font style="color:rgb(0, 0, 0);">WebSocket 服务器 (WebSocket server)</font>**<font style="color:rgb(0, 0, 0);">，并建立一个处理程序以接收 </font>**<font style="color:rgb(0, 0, 0);">JSON 对象格式 (JSON object format)</font>**<font style="color:rgb(0, 0, 0);"> 的消息。此代码通常像之前一样处理文本聊天消息。</font>

#### <font style="color:rgb(0, 0, 0);">向信令服务器发送消息 (Sending messages to the signaling server)</font>
<font style="color:rgb(0, 0, 0);">在我们的代码中，我们调用 </font>`<font style="color:rgb(0, 0, 0);">sendToServer()</font>`<font style="color:rgb(0, 0, 0);">来向信令服务器发送消息。此函数使用 </font>**<font style="color:rgb(0, 0, 0);">WebSocket 连接 (WebSocket connection)</font>**<font style="color:rgb(0, 0, 0);"> 来完成其工作：</font>

```javascript
function sendToServer(msg) {
  const msgJSON = JSON.stringify(msg);
  connection.send(msgJSON);
}
```

<font style="color:rgb(0, 0, 0);">传递给此函数的消息对象通过调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">JSON.stringify()</font>`<font style="color:rgb(0, 0, 0);">转换为 </font>**<font style="color:rgb(0, 0, 0);">JSON 字符串 (JSON string)</font>**<font style="color:rgb(0, 0, 0);">，然后我们调用 WebSocket 连接的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">send()</font>`<font style="color:rgb(0, 0, 0);">函数将消息传输到服务器。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### <font style="color:rgb(0, 0, 0);">启动通话的用户界面 (UI to start a call)</font>
<font style="color:rgb(0, 0, 0);">处理 "user-list" 消息的代码调用 </font>`<font style="color:rgb(0, 0, 0);">handleUserListMsg()</font>`<font style="color:rgb(0, 0, 0);">。在这里，我们为显示在聊天面板左侧的用户列表中的每个已连接用户设置处理程序。此函数接收一个消息对象，其 </font>`<font style="color:rgb(0, 0, 0);">users</font>`**<font style="color:rgb(0, 0, 0);">属性 (property)</font>**<font style="color:rgb(0, 0, 0);"> 是一个字符串数组，指定每个已连接用户的用户名。</font>

```javascript
function handleUserListMsg(msg) {
  const listElem = document.querySelector(".user-list-box");
  while (listElem.firstChild) {
    listElem.removeChild(listElem.firstChild);
  }
  msg.users.forEach((username) => {
    const item = document.createElement("li");
    item.appendChild(document.createTextNode(username));
    item.addEventListener("click", invite, false);
    listElem.appendChild(item);
  });
}
```

<font style="color:rgb(0, 0, 0);">在将包含用户名字列表的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><ul></font>`<font style="color:rgb(0, 0, 0);">的引用获取到变量</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">listElem</font>`<font style="color:rgb(0, 0, 0);">后，我们通过删除其每个子元素来清空列表。</font>

<font style="color:rgb(0, 0, 0);"></font>

> **<font style="color:rgba(0, 0, 0, 0.4);">注意：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 显然，通过添加和删除单个用户来更新列表会更高效，而不是在每次更改时重建整个列表，但出于本示例的目的，这已经足够好了。</font>
>

<font style="color:rgba(0, 0, 0, 0.4);"></font>

<font style="color:rgb(0, 0, 0);">然后我们使用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">forEach()</font>`<font style="color:rgb(0, 0, 0);">遍历用户名数组。对于每个名称，我们创建一个新的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><li></font>`<font style="color:rgb(0, 0, 0);">元素，然后使用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">createTextNode()</font>`<font style="color:rgb(0, 0, 0);">创建一个包含用户名的新</font>**<font style="color:rgb(0, 0, 0);">文本节点 (text node)</font>**<font style="color:rgb(0, 0, 0);">。该文本节点被添加为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><li></font>`<font style="color:rgb(0, 0, 0);">元素的子节点。接下来，我们为列表项上的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">click</font>`**<font style="color:rgb(0, 0, 0);">事件 (event)</font>**<font style="color:rgb(0, 0, 0);"> 设置一个处理程序，点击用户名会调用我们的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">invite()</font>`<font style="color:rgb(0, 0, 0);">方法，我们将在下一节中介绍它。</font>

<font style="color:rgb(0, 0, 0);">最后，我们将新项附加到包含所有用户名的 </font>`<font style="color:rgb(0, 0, 0);"><ul></font>`<font style="color:rgb(0, 0, 0);">中。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### <font style="color:rgb(0, 0, 0);">启动通话 (Starting a call)</font>
<font style="color:rgb(0, 0, 0);">当用户点击他们想要呼叫的用户名时，</font>`<font style="color:rgb(0, 0, 0);">invite()</font>`<font style="color:rgb(0, 0, 0);">函数作为该点击事件的事件处理程序被调用：</font>

```javascript
const mediaConstraints = {
  audio: true, // 我们需要音频轨道
  video: true, // 我们需要视频轨道
};

function invite(evt) {
  if (myPeerConnection) {
    alert("You can't start a call because you already have one open!");
  } else {
    const clickedUsername = evt.target.textContent;
    if (clickedUsername === myUsername) {
      alert("I'm afraid I can't let you talk to yourself. That would be weird.");
      return;
    }
    targetUsername = clickedUsername;
    createPeerConnection();
    navigator.mediaDevices
      .getUserMedia(mediaConstraints)
      .then((localStream) => {
        document.getElementById("local_video").srcObject = localStream;
        localStream
          .getTracks()
          .forEach((track) => myPeerConnection.addTrack(track, localStream));
      })
      .catch(handleGetUserMediaError);
  }
}
```

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">这首先进行一个基本的健全性检查：用户是否已经连接？如果已经存在一个 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">，他们显然无法进行呼叫。然后从事件目标的 </font>`<font style="color:rgb(0, 0, 0);">textContent</font>`<font style="color:rgb(0, 0, 0);">属性获取被点击用户的名称，并确保它不是试图发起呼叫的同一用户。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">然后我们将要呼叫的用户名复制到变量</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">targetUsername</font>`<font style="color:rgb(0, 0, 0);">中，并调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">createPeerConnection()</font>`<font style="color:rgb(0, 0, 0);">，该函数将创建并基本配置</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">一旦</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">被创建，我们通过调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">MediaDevices.getUserMedia()</font>`<font style="color:rgb(0, 0, 0);">（通过</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">MediaDevices.getUserMedia</font>`<font style="color:rgb(0, 0, 0);">属性暴露给我们）请求访问用户的摄像头和麦克风。当此操作成功，兑现返回的 </font>**<font style="color:rgb(0, 0, 0);">Promise</font>**<font style="color:rgb(0, 0, 0);"> 时，我们的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">then</font>`**<font style="color:rgb(0, 0, 0);">处理程序 (handler)</font>**<font style="color:rgb(0, 0, 0);"> 被执行。它接收一个</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">MediaStream</font>`<font style="color:rgb(0, 0, 0);">对象作为输入，表示来自用户麦克风的音频和网络摄像头的视频流。</font>

<font style="color:rgb(0, 0, 0);"></font>

> **<font style="color:rgba(0, 0, 0, 0.4);">注意：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 我们可以通过调用 </font>`<font style="color:rgba(0, 0, 0, 0.4);">navigator.mediaDevices.enumerateDevices()</font>`<font style="color:rgba(0, 0, 0, 0.4);">获取设备列表，根据所需条件过滤结果列表，然后在传递给 </font>`<font style="color:rgba(0, 0, 0, 0.4);">getUserMedia()</font>`<font style="color:rgba(0, 0, 0, 0.4);">的 </font>`<font style="color:rgba(0, 0, 0, 0.4);">mediaConstraints</font>`<font style="color:rgba(0, 0, 0, 0.4);">对象中的 </font>`<font style="color:rgba(0, 0, 0, 0.4);">deviceId</font>`<font style="color:rgba(0, 0, 0, 0.4);">字段使用所选设备的 </font>`<font style="color:rgba(0, 0, 0, 0.4);">deviceId</font>`<font style="color:rgba(0, 0, 0, 0.4);">值，来限制允许的媒体输入到特定设备或设备集。实际上，这很少甚至没有必要，因为 </font>`<font style="color:rgba(0, 0, 0, 0.4);">getUserMedia()</font>`<font style="color:rgba(0, 0, 0, 0.4);">已经为您完成了大部分工作。</font>
>

<font style="color:rgba(0, 0, 0, 0.4);"></font>

<font style="color:rgb(0, 0, 0);">我们通过设置元素的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">srcObject</font>`<font style="color:rgb(0, 0, 0);">属性将传入的流附加到本地预览</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素。由于该元素配置为自动播放传入视频，流开始在本地预览框中播放。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">然后我们遍历流中的</font>**<font style="color:rgb(0, 0, 0);">轨道 (tracks)</font>**<font style="color:rgb(0, 0, 0);">，调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">addTrack()</font>`<font style="color:rgb(0, 0, 0);">将每个轨道添加到</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">。即使连接尚未完全建立，您也可以在认为合适时开始发送数据。在 </font>**<font style="color:rgb(0, 0, 0);">ICE 协商 (ICE negotiation)</font>**<font style="color:rgb(0, 0, 0);"> 完成之前接收的媒体可能有助于 ICE 决定采取的最佳连接方法，从而帮助协商过程。</font>

<font style="color:rgb(0, 0, 0);"></font>

> **<font style="color:rgba(0, 0, 0, 0.4);">注意：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 对于原生应用程序（例如电话应用程序），您不应在两端都接受连接之前开始发送，至少是为了避免在用户未准备好时无意中发送视频和/或音频数据。</font>
>

<font style="color:rgba(0, 0, 0, 0.4);"></font>

<font style="color:rgb(0, 0, 0);">一旦媒体附加到</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">，就会在连接上触发一个</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">negotiationneeded</font>`**<font style="color:rgb(0, 0, 0);">事件 (event)</font>**<font style="color:rgb(0, 0, 0);">，以便可以开始 ICE 协商。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">如果在尝试获取本地媒体流时发生错误，我们的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">catch</font>`<font style="color:rgb(0, 0, 0);">子句会调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">handleGetUserMediaError()</font>`<font style="color:rgb(0, 0, 0);">，根据需要向用户显示适当的错误。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### <font style="color:rgb(0, 0, 0);">处理 getUserMedia() 错误 (Handling getUserMedia() errors)</font>
<font style="color:rgb(0, 0, 0);">如果 </font>`<font style="color:rgb(0, 0, 0);">getUserMedia()</font>`<font style="color:rgb(0, 0, 0);">返回的 Promise 以失败告终，则执行我们的 </font>`<font style="color:rgb(0, 0, 0);">handleGetUserMediaError()</font>`<font style="color:rgb(0, 0, 0);">函数。</font>

```javascript
function handleGetUserMediaError(e) {
  switch (e.name) {
    case "NotFoundError":
      alert("Unable to open your call because no camera and/or microphone were found.");
      break;
    case "SecurityError":
    case "PermissionDeniedError":
      // 不执行任何操作；这与用户取消呼叫相同。
      break;
    default:
      alert(`Error opening your camera and/or microphone: ${e.message}`);
      break;
  }
  closeVideoCall();
}
```

<font style="color:rgb(0, 0, 0);">除一种情况外，所有情况都会显示错误消息。在此示例中，我们</font>**<font style="color:rgb(0, 0, 0);">忽略 "SecurityError" 和 "PermissionDeniedError" 结果，将拒绝授予使用媒体硬件的权限视为用户取消呼叫。</font>**

**<font style="color:rgb(0, 0, 0);"></font>**

<font style="color:rgb(0, 0, 0);">无论获取流失败的原因是什么，我们都会调用 </font>`<font style="color:rgb(0, 0, 0);">closeVideoCall()</font>`<font style="color:rgb(0, 0, 0);">函数来关闭 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">，并释放尝试呼叫过程中已分配的任何资源。此代码旨在安全地处理部分启动的呼叫。</font>

#### <font style="color:rgb(0, 0, 0);">创建对等连接 (Creating the peer connection)</font>


`<font style="color:rgb(0, 0, 0);">createPeerConnection()</font>`<font style="color:rgb(0, 0, 0);">函数由呼叫方和被叫方用来构建它们的 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">对象，即 WebRTC 连接的各自一端。当呼叫方尝试开始呼叫时由 </font>`<font style="color:rgb(0, 0, 0);">invite()</font>`<font style="color:rgb(0, 0, 0);">调用，当被叫方从呼叫方收到提议消息时由 </font>`<font style="color:rgb(0, 0, 0);">handleVideoOfferMsg()</font>`<font style="color:rgb(0, 0, 0);">调用。</font>

```javascript
function createPeerConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      // 关于 ICE 服务器的信息 - 使用您自己的！
      {
        urls: "stun:stun.stunprotocol.org",
      },
    ],
  });
  myPeerConnection.onicecandidate = handleICECandidateEvent;
  myPeerConnection.ontrack = handleTrackEvent;
  myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
  myPeerConnection.onremovetrack = handleRemoveTrackEvent;
  myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
}
```

使用 `RTCPeerConnection()`**构造函数 (constructor)** 时，我们将指定一个对象，为连接提供配置参数。在此示例中，我们仅使用其中之一：`iceServers`。这是一个描述 **STUN** 和/或 **TURN 服务器 (TURN servers)** 的对象数组，供 **ICE 层 (ICE layer)** 在尝试建立呼叫方和被叫方之间的路由时使用。这些服务器用于确定在对等端之间通信时要使用的最佳路由和协议，即使它们位于防火墙后面或使用 **NAT**。



> **<font style="color:rgba(0, 0, 0, 0.4);">注意：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 您应始终使用您拥有或拥有特定授权使用的 STUN/TURN 服务器。此示例使用了一个已知的公共 STUN 服务器，但滥用这些服务器是不好的行为。</font>
>

<font style="color:rgba(0, 0, 0, 0.4);"></font>

`**iceServers**`**中的每个对象至少包含一个 **`**urls**`**字段，提供可以访问指定服务器的 URLs。如果需要，它还可以提供 **`**username**`**和 **`**credential**`**值以允许进行身份验证。**



创建 `RTCPeerConnection`后，我们为对我们重要的事件设置处理程序。

**前三个事件处理程序是必需的；您必须处理它们才能使用 WebRTC 进行任何涉及流媒体的操作**。其余的不是严格必需的，但可能有用，我们将探讨它们。还有一些其他可用的事件我们没有在此示例中使用。以下是我们将实现的每个事件处理程序的摘要：

+ <font style="color:rgb(0, 0, 0);"></font>`[**onicecandidate**](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event)`

当本地 **ICE 层**需要您通过信令服务器将 **ICE 候选地址 (ICE candidate)** 传输到另一个对等端时，它会调用您的 `[icecandidate](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event)`事件处理程序。有关更多信息以及查看此示例的代码，请参阅**发送 ICE 候选地址 (**[**Sending ICE candidates**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#sending_ice_candidates)**)**。

+ <font style="color:rgb(0, 0, 0);"></font>`[**ontrack**](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/track_event)`

当**轨道 (**[**track**](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/track_event)**)** 添加到连接时，本地 WebRTC 层会调用此 `track`事件的处理程序。这使您可以将传入的媒体连接到元素以显示它。详情请参阅**接收新流 (**[**Receiving new streams**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#receiving_new_streams)**)**。

+ <font style="color:rgb(0, 0, 0);"></font>`[**onnegotiationneeded**](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/negotiationneeded_event)`

每当 WebRTC 基础结构需要您重新开始会话协商过程时，都会调用此函数。它的工作是创建并向被叫方发送一个**提议 (offer)**，要求其与我们连接。请参阅**开始协商 (**[**Starting negotiation**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#starting_negotiation)**)** 以了解我们如何处理此问题。

+ <font style="color:rgb(0, 0, 0);"></font>`**onremovetrack**`

此 `ontrack`的对应项用于处理 `[removetrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/removetrack_event)`事件；当远程对等端从正在发送的媒体中移除轨道时，会将其发送到 `RTCPeerConnection`。请参阅**处理轨道的移除 (**[**Handling the removal of tracks**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#handling_the_removal_of_tracks)**)**。

+ <font style="color:rgb(0, 0, 0);"></font>`[**oniceconnectionstatechange**](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceconnectionstatechange_event)`

`[iceconnectionstatechange](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceconnectionstatechange_event)`事件由 ICE 层发送，让您了解 ICE 连接状态的变化。这可以帮助您知道连接何时失败或丢失。我们将在下面的 **ICE 连接状态 (**[**ICE connection state**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#ice_connection_state)**)** 中查看此示例的代码。

+ <font style="color:rgb(0, 0, 0);"></font>`[**onicegatheringstatechange**](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event)`

当 **ICE 代理 (ICE agent)** 收集候选地址的过程从一个状态转换到另一个状态（例如开始收集候选地址或完成协商）时，ICE 层会向您发送 `[icegatheringstatechange](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event)`事件。请参阅下面的 **ICE 收集状态 (**[**ICE gathering state**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#ice_gathering_state)**)**。

+ <font style="color:rgb(0, 0, 0);"></font>`[**onsignalingstatechange**](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/signalingstatechange_event)`

当信令过程的状态发生变化（或与信令服务器的连接发生变化）时，WebRTC 基础结构会向您发送 `s[ignalingstatechange](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/signalingstatechange_event)`消息。请参阅**信令状态 (**[**Signaling state**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#ice_signaling_state)**)** 以查看我们的代码。

---

#### 开始协商 (Starting negotiation)
一旦呼叫方创建了其 `RTCPeerConnection`，创建了媒体流，并将其轨道添加到连接中（如**启动通话 (**[**Starting a call**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#starting_a_call)**)** 中所示），浏览器将向 `RTCPeerConnection`传递一个 `negotiationneeded`事件，表明它已准备好开始与另一个对等端协商。这是我们处理 `negotiationneeded`事件的代码：

```javascript
function handleNegotiationNeededEvent() {
  myPeerConnection
    .createOffer()
    .then((offer) => myPeerConnection.setLocalDescription(offer))
    .then(() => {
      sendToServer({
        name: myUsername,
        target: targetUsername,
        type: "video-offer",
        sdp: myPeerConnection.localDescription,
      });
    })
    .catch(window.reportError);
}
```

<font style="color:rgb(0, 0, 0);">为了开始协商过程，我们需要创建并向我们想要连接的对等端发送一个 </font>**<font style="color:rgb(0, 0, 0);">SDP 提议 (SDP offer)</font>**<font style="color:rgb(0, 0, 0);">。此提议包括连接支持的配置列表，有关我们在本地添加到连接的媒体流的信息（即我们想要发送到呼叫另一端的视频），以及 ICE 层已经收集的任何 </font>**<font style="color:rgb(0, 0, 0);">ICE 候选地址 (ICE candidates)</font>**<font style="color:rgb(0, 0, 0);">。我们通过调用</font><font style="color:rgb(0, 0, 0);"> </font>`[myPeerConnection.createOffer()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer)`<font style="color:rgb(0, 0, 0);">来创建此提议。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">当</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">createOffer()</font>`<font style="color:rgb(0, 0, 0);">成功（兑现承诺）时，我们将创建的提议信息传递给</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">myPeerConnection.setLocalDescription()</font>`<font style="color:rgb(0, 0, 0);">，该函数为呼叫方的连接端配置连接和媒体配置状态。</font>

<font style="color:rgb(0, 0, 0);"></font>

> **<font style="color:rgba(0, 0, 0, 0.4);">注意：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 严格来说，</font>`<font style="color:rgba(0, 0, 0, 0.4);">createOffer()</font>`<font style="color:rgba(0, 0, 0, 0.4);">返回的字符串是一个 </font>**<font style="color:rgba(0, 0, 0, 0.4);">RFC 3264</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 提议。</font>
>

<font style="color:rgba(0, 0, 0, 0.4);"></font>

<font style="color:rgb(0, 0, 0);">当</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">setLocalDescription()</font>`<font style="color:rgb(0, 0, 0);">返回的承诺被兑现时，我们知道描述是有效的并且已被设置。此时，我们通过创建一个包含本地描述（现在与提议相同）的新 "video-offer" 消息，然后通过我们的信令服务器将其发送给被叫方，从而将我们的提议发送给另一个对等端。该提议具有以下成员：</font>

+ <font style="color:rgb(0, 0, 0);"></font>`**<font style="color:rgb(0, 0, 0);">type</font>**`<font style="color:rgb(0, 0, 0);">: 消息类型："video-offer"。</font>
+ <font style="color:rgb(0, 0, 0);"></font>`**<font style="color:rgb(0, 0, 0);">name</font>**`<font style="color:rgb(0, 0, 0);">: 呼叫方的用户名。</font>
+ <font style="color:rgb(0, 0, 0);"></font>`**<font style="color:rgb(0, 0, 0);">target</font>**`<font style="color:rgb(0, 0, 0);">: 我们希望呼叫的用户名。</font>
+ `**<font style="color:rgb(0, 0, 0);">sdp</font>**`<font style="color:rgb(0, 0, 0);">: 描述提议的 </font>**<font style="color:rgb(0, 0, 0);">SDP 字符串 (SDP string)</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">如果发生错误，无论是在初始的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">createOffer()</font>`<font style="color:rgb(0, 0, 0);">中还是在随后的任何兑现处理程序中，都会通过调用我们的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">window.reportError()</font>`<font style="color:rgb(0, 0, 0);">函数报告错误。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">一旦</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">setLocalDescription()</font>`<font style="color:rgb(0, 0, 0);">的兑现处理程序运行，</font>**<font style="color:rgb(0, 0, 0);">ICE 代理 (ICE agent)</font>**<font style="color:rgb(0, 0, 0);"> 就开始向</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">发送</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">icecandidate</font>`<font style="color:rgb(0, 0, 0);">事件，每个潜在配置发送一个。我们的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">icecandidate</font>`<font style="color:rgb(0, 0, 0);">事件处理程序负责将候选地址传输给另一个对等端。</font>

<font style="color:rgb(0, 0, 0);"></font>

#### <font style="color:rgb(0, 0, 0);">会话协商 (Session negotiation)</font>
<font style="color:rgb(0, 0, 0);">现在我们已经开始与另一个对等端协商并发送了提议，让我们看看在被叫方连接端发生了什么。被叫方收到提议并调用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">handleVideoOfferMsg()</font>`<font style="color:rgb(0, 0, 0);">函数来处理它。让我们看看被叫方如何处理 "video-offer" 消息。</font>

---

#### <font style="color:rgb(0, 0, 0);">处理邀请 (Handling the invitation)</font>
<font style="color:rgb(0, 0, 0);">当提议到达时，被叫方的 </font>`<font style="color:rgb(0, 0, 0);">handleVideoOfferMsg()</font>`<font style="color:rgb(0, 0, 0);">函数被调用，并传入收到的 "video-offer" 消息。此函数需要做两件事。首先，它需要创建自己的 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">，并将包含其麦克风和网络摄像头音频和视频的轨道添加到其中。其次，它需要处理收到的提议，构建并发送其应答。</font>

```javascript
function handleVideoOfferMsg(msg) {
  let localStream = null;
  targetUsername = msg.name;
  createPeerConnection();
  const desc = new RTCSessionDescription(msg.sdp);
  myPeerConnection
    .setRemoteDescription(desc)
    .then(() => navigator.mediaDevices.getUserMedia(mediaConstraints))
    .then((stream) => {
      localStream = stream;
      document.getElementById("local_video").srcObject = localStream;
      localStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, localStream));
    })
    .then(() => myPeerConnection.createAnswer())
    .then((answer) => myPeerConnection.setLocalDescription(answer))
    .then(() => {
      const msg = {
        name: myUsername,
        target: targetUsername,
        type: "video-answer",
        sdp: myPeerConnection.localDescription,
      };
      sendToServer(msg);
    })
    .catch(handleGetUserMediaError);
}
```

<font style="color:rgb(0, 0, 0);">此代码与我们在</font>**<font style="color:rgb(0, 0, 0);">启动通话 (Starting a call)</font>**<font style="color:rgb(0, 0, 0);"> 中的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">invite()</font>`<font style="color:rgb(0, 0, 0);">函数所做的非常相似。它首先使用我们的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">createPeerConnection()</font>`<font style="color:rgb(0, 0, 0);">函数创建并配置一个</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">。然后它从收到的 "video-offer" 消息中获取 </font>**<font style="color:rgb(0, 0, 0);">SDP 提议 (SDP offer)</font>**<font style="color:rgb(0, 0, 0);">，并使用它创建一个新的</font><font style="color:rgb(0, 0, 0);"> </font>`[RTCSessionDescription](https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription)`<font style="color:rgb(0, 0, 0);">对象，表示呼叫方的</font>**<font style="color:rgb(0, 0, 0);">会话描述 (session description)</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">然后该会话描述被传递给</font><font style="color:rgb(0, 0, 0);"> </font>`[myPeerConnection.setRemoteDescription()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription)`<font style="color:rgb(0, 0, 0);">。这将收到的提议建立为远程（呼叫方）连接端的描述。如果成功，承诺兑现处理程序（在</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">then()</font>`<font style="color:rgb(0, 0, 0);">子句中）开始使用</font><font style="color:rgb(0, 0, 0);"> </font>`[getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)`<font style="color:rgb(0, 0, 0);">获取对被叫方摄像头和麦克风的访问权限，将轨道添加到连接等，就像我们之前在</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">invite()</font>`<font style="color:rgb(0, 0, 0);">中看到的那样。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">一旦使用</font><font style="color:rgb(0, 0, 0);"> </font>`[myPeerConnection.createAnswer()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer)`<font style="color:rgb(0, 0, 0);">创建了</font>**<font style="color:rgb(0, 0, 0);">应答 (answer)</font>**<font style="color:rgb(0, 0, 0);">，通过调用</font><font style="color:rgb(0, 0, 0);"> </font>`[myPeerConnection.setLocalDescription()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription)`<font style="color:rgb(0, 0, 0);">将连接本端的描述设置为应答的 </font>**<font style="color:rgb(0, 0, 0);">SDP</font>**<font style="color:rgb(0, 0, 0);">，然后应答通过信令服务器传输给呼叫方，让他们知道应答是什么。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">任何错误都会被捕获并传递给</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">handleGetUserMediaError()</font>`<font style="color:rgb(0, 0, 0);">，如</font>**<font style="color:rgb(0, 0, 0);">处理 getUserMedia() 错误 (</font>**[**Handling getUserMedia() errors**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#handling_getusermedia_errors)**<font style="color:rgb(0, 0, 0);">)</font>**<font style="color:rgb(0, 0, 0);"> 中所述。</font>

<font style="color:rgb(0, 0, 0);"></font>

> **<font style="color:rgba(0, 0, 0, 0.4);">注意：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 与呼叫方的情况一样，一旦 </font>`<font style="color:rgba(0, 0, 0, 0.4);">setLocalDescription()</font>`<font style="color:rgba(0, 0, 0, 0.4);">的兑现处理程序运行，浏览器就会开始触发 </font>`<font style="color:rgba(0, 0, 0, 0.4);">icecandidate</font>`<font style="color:rgba(0, 0, 0, 0.4);">事件，被叫方必须处理这些事件，每个需要传输到远程对等端的候选地址一个事件。</font>
>

<font style="color:rgba(0, 0, 0, 0.4);"></font>

<font style="color:rgb(0, 0, 0);">最后，呼叫方处理它收到的应答消息，创建一个表示被叫方会话描述的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCSessionDescription</font>`<font style="color:rgb(0, 0, 0);">对象，并将其传递给</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">myPeerConnection.setRemoteDescription()</font>`<font style="color:rgb(0, 0, 0);">。</font>

```javascript
function handleVideoAnswerMsg(msg) {
  const desc = new RTCSessionDescription(msg.sdp);
  myPeerConnection.setRemoteDescription(desc).catch(window.reportError);
}
```

---

#### <font style="color:rgb(0, 0, 0);">发送 ICE 候选地址 (Sending ICE candidates)</font>


**<font style="color:rgb(0, 0, 0);">ICE 协商 (ICE negotiation)</font>**<font style="color:rgb(0, 0, 0);"> 过程涉及每个对等端将候选地址发送给另一个对等端，反复进行，直到它耗尽支持</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">媒体传输需求的所有可能方式。由于 ICE 不知道您的信令服务器，您的代码在处理</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">icecandidate</font>`<font style="color:rgb(0, 0, 0);">事件时处理每个候选地址的传输。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">您的 </font>`<font style="color:rgb(0, 0, 0);">onicecandidate</font>`<font style="color:rgb(0, 0, 0);">处理程序接收一个事件，其 </font>`<font style="color:rgb(0, 0, 0);">candidate</font>`<font style="color:rgb(0, 0, 0);">属性是描述候选地址的 </font>**<font style="color:rgb(0, 0, 0);">SDP</font>**<font style="color:rgb(0, 0, 0);">（或者是 </font>`<font style="color:rgb(0, 0, 0);">null</font>`<font style="color:rgb(0, 0, 0);">表示 ICE 层已耗尽要建议的潜在配置）。</font>`<font style="color:rgb(0, 0, 0);">candidate</font>`<font style="color:rgb(0, 0, 0);">的内容是您需要使用信令服务器传输的内容。这是我们示例的实现：</font>

```javascript
function handleICECandidateEvent(event) {
  if (event.candidate) {
    sendToServer({
      type: "new-ice-candidate",
      target: targetUsername,
      candidate: event.candidate,
    });
  }
}
```

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">这会构建一个包含候选地址的对象，然后使用先前在</font>**<font style="color:rgb(0, 0, 0);">向信令服务器发送消息 (</font>**[**Sending messages to the signaling server**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#sending_messages_to_the_signaling_server)**<font style="color:rgb(0, 0, 0);">)</font>**<font style="color:rgb(0, 0, 0);"> 中描述的</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">sendToServer()</font>`<font style="color:rgb(0, 0, 0);">函数将其发送给另一个对等端。消息的属性是：</font>

+ <font style="color:rgb(0, 0, 0);"></font>`**<font style="color:rgb(0, 0, 0);">type</font>**`<font style="color:rgb(0, 0, 0);">: 消息类型："new-ice-candidate"。</font>
+ <font style="color:rgb(0, 0, 0);"></font>`**<font style="color:rgb(0, 0, 0);">target</font>**`<font style="color:rgb(0, 0, 0);">: ICE 候选地址需要传递到的用户名。这让信令服务器路由消息。</font>
+ <font style="color:rgb(0, 0, 0);"></font>`**<font style="color:rgb(0, 0, 0);">candidate</font>**`<font style="color:rgb(0, 0, 0);">: 表示 ICE 层想要传输给另一个对等端的候选地址的 </font>**<font style="color:rgb(0, 0, 0);">SDP</font>**<font style="color:rgb(0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);">此消息的格式（与处理信令时所做的所有事情一样）完全取决于您，取决于您的需求；您可以根据需要提供其他信息。</font>

> **<font style="color:rgba(0, 0, 0, 0.4);">注意：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 请务必记住，当 ICE 候选地址从呼叫的另一端到达时，不会发送 </font>`<font style="color:rgba(0, 0, 0, 0.4);">icecandidate</font>`<font style="color:rgba(0, 0, 0, 0.4);">事件。相反，它们由您自己这一端发送，以便您可以承担通过您选择的任何通道传输数据的任务。当您刚接触 WebRTC 时，这可能会令人困惑。</font>
>

---

#### <font style="color:rgb(0, 0, 0);">接收 ICE 候选地址 (Receiving ICE candidates)</font>
<font style="color:rgb(0, 0, 0);">信令服务器使用其选择的任何方法将每个 </font>**<font style="color:rgb(0, 0, 0);">ICE 候选地址</font>**<font style="color:rgb(0, 0, 0);">传送到目标对等端；在我们的示例中，这是作为 </font>**<font style="color:rgb(0, 0, 0);">JSON 对象 (JSON objects)</font>**<font style="color:rgb(0, 0, 0);">，其 </font>`<font style="color:rgb(0, 0, 0);">type</font>`<font style="color:rgb(0, 0, 0);">属性包含字符串 "new-ice-candidate"。我们的 </font>`<font style="color:rgb(0, 0, 0);">handleNewICECandidateMsg()</font>`<font style="color:rgb(0, 0, 0);">函数由我们的主 WebSocket 传入消息代码调用以处理这些消息：</font>



```javascript
function handleNewICECandidateMsg(msg) {
  const candidate = new RTCIceCandidate(msg.candidate);
  myPeerConnection.addIceCandidate(candidate).catch(window.reportError);
}
```

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">此函数通过将接收到的 </font>**<font style="color:rgb(0, 0, 0);">SDP</font>**<font style="color:rgb(0, 0, 0);"> 传递给其构造函数来构造一个</font><font style="color:rgb(0, 0, 0);"> </font>`[RTCIceCandidate](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate)`<font style="color:rgb(0, 0, 0);">对象，然后通过将其传递给</font><font style="color:rgb(0, 0, 0);"> </font>`[myPeerConnection.addIceCandidate()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addIceCandidate)`<font style="color:rgb(0, 0, 0);">将候选地址交付给 </font>**<font style="color:rgb(0, 0, 0);">ICE 层</font>**<font style="color:rgb(0, 0, 0);">。这将新的 ICE 候选地址交给本地 ICE 层，最后，我们处理此候选地址的过程中的角色完成。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">每个对等端向另一个对等端发送一个候选地址，用于它认为可能对正在交换的媒体可行的每种可能的传输配置。在某个时刻，两个对等端同意某个候选地址是一个不错的选择，它们打开连接并开始共享媒体。然而，重要的是要注意，一旦媒体开始流动，ICE 协商</font>**<font style="color:rgb(0, 0, 0);">不会停止 (does not stop)</font>**<font style="color:rgb(0, 0, 0);">。相反，在对话开始后，候选地址可能仍然继续交换，要么是为了尝试找到更好的连接方法，要么是因为在对等端成功建立连接时它们已经在传输中。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">此外，如果发生导致流媒体场景变化的情况，协商将再次开始，</font>`[negotiationneeded](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/negotiationneeded_event)`<font style="color:rgb(0, 0, 0);">事件被发送到</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">，并且整个过程如前所述重新开始。这可能发生在各种情况下，包括：</font>

+ <font style="color:rgb(0, 0, 0);">网络状态的变化，例如带宽变化、从 Wi-Fi 切换到蜂窝连接等。</font>
+ <font style="color:rgb(0, 0, 0);">在手机的前置和后置摄像头之间切换。</font>
+ <font style="color:rgb(0, 0, 0);">流的配置发生变化，例如其分辨率或帧速率。</font>

---

#### <font style="color:rgb(0, 0, 0);">接收新流 (Receiving new streams)</font>
<font style="color:rgb(0, 0, 0);">当新</font>**<font style="color:rgb(0, 0, 0);">轨道 (tracks)</font>**<font style="color:rgb(0, 0, 0);"> 添加到 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">时——无论是通过调用其 </font>`<font style="color:rgb(0, 0, 0);">addTrack()</font>`<font style="color:rgb(0, 0, 0);">方法还是由于流的格式重新协商——对于添加到连接中的每个轨道，都会向 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">设置一个 </font>`<font style="color:rgb(0, 0, 0);">track</font>`<font style="color:rgb(0, 0, 0);">事件。利用新添加的媒体需要为 </font>`<font style="color:rgb(0, 0, 0);">track</font>`<font style="color:rgb(0, 0, 0);">事件实现一个处理程序。一个常见的需求是将传入的媒体附加到适当的 </font>**<font style="color:rgb(0, 0, 0);">HTML 元素 (HTML element)</font>**<font style="color:rgb(0, 0, 0);">。在我们的示例中，我们将轨道的流添加到显示传入视频的 </font>`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素：</font>

```javascript
function handleTrackEvent(event) {
  document.getElementById("received_video").srcObject = event.streams[0];
  document.getElementById("hangup-button").disabled = false;
}
```

<font style="color:rgb(0, 0, 0);">传入的流被附加到 "received_video"</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素，并且 "Hang Up"</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><button></font>`<font style="color:rgb(0, 0, 0);">元素被启用，以便用户可以挂断通话。</font>

<font style="color:rgb(0, 0, 0);">一旦此代码完成，另一个对等端发送的视频最终显示在本地浏览器窗口中！</font>

---

#### <font style="color:rgb(0, 0, 0);">处理轨道的移除 (Handling the removal of tracks)</font>
<font style="color:rgb(0, 0, 0);">当远程对等端通过调用 </font>`[RTCPeerConnection.removeTrack()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeTrack)`<font style="color:rgb(0, 0, 0);">从连接中移除轨道时，您的代码会收到一个 </font>`[removetrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/removetrack_event)`<font style="color:rgb(0, 0, 0);">事件。我们对 "removetrack" 的处理程序是：</font>

```javascript
function handleRemoveTrackEvent(event) {
  const stream = document.getElementById("received_video").srcObject;
  const trackList = stream.getTracks();
  if (trackList.length === 0) {
    closeVideoCall();
  }
}
```

<font style="color:rgb(0, 0, 0);">此代码从 "received_video"</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素的</font><font style="color:rgb(0, 0, 0);"> </font>`[srcObject](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/srcObject)`<font style="color:rgb(0, 0, 0);">属性获取传入视频的</font><font style="color:rgb(0, 0, 0);"> </font>`[MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)`<font style="color:rgb(0, 0, 0);">，然后调用流的</font><font style="color:rgb(0, 0, 0);"> </font>`[getTracks()](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getTracks)`<font style="color:rgb(0, 0, 0);">方法以获取流的轨道数组。</font>

<font style="color:rgb(0, 0, 0);">如果数组的长度为零，意味着流中没有剩余的轨道，我们通过调用 </font>`<font style="color:rgb(0, 0, 0);">closeVideoCall()</font>`<font style="color:rgb(0, 0, 0);">结束呼叫。这将干净地将我们的应用程序恢复到准备好开始或接收另一个呼叫的状态。请参阅</font>**<font style="color:rgb(0, 0, 0);">结束呼叫 (</font>**[**Ending the call**](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling#ending_the_call)**<font style="color:rgb(0, 0, 0);">)</font>**<font style="color:rgb(0, 0, 0);"> 以了解 </font>`<font style="color:rgb(0, 0, 0);">closeVideoCall()</font>`<font style="color:rgb(0, 0, 0);">的工作原理。</font>

---

#### <font style="color:rgb(0, 0, 0);">结束呼叫 (Ending the call)</font>
<font style="color:rgb(0, 0, 0);">呼叫结束的原因有很多。呼叫可能已完成，一方或双方已挂断。可能发生了网络故障，或者一个用户可能退出了他们的浏览器，或者系统崩溃。无论如何，所有美好的事物都必须结束。</font>

---

#### <font style="color:rgb(0, 0, 0);">挂断 (Hanging up)</font>
<font style="color:rgb(0, 0, 0);">当用户点击 "Hang Up" 按钮结束呼叫时，调用 </font>`<font style="color:rgb(0, 0, 0);">hangUpCall()</font>`<font style="color:rgb(0, 0, 0);">函数：</font>

```javascript
function hangUpCall() {
  closeVideoCall();
  sendToServer({
    name: myUsername,
    target: targetUsername,
    type: "hang-up",
  });
}
```

`<font style="color:rgb(0, 0, 0);">hangUpCall()</font>`<font style="color:rgb(0, 0, 0);">执行 </font>`<font style="color:rgb(0, 0, 0);">closeVideoCall()</font>`<font style="color:rgb(0, 0, 0);">以关闭和重置连接并释放资源。然后它构建一个 "hang-up" 消息并将其发送到呼叫的另一端，通知另一个对等端干净地关闭自身。</font>

---

#### 结束呼叫 (Ending the call)
如下所示的 `closeVideoCall()`函数负责停止流、清理并处置 `RTCPeerConnection`对象：

```javascript
function closeVideoCall() {
  const remoteVideo = document.getElementById("received_video");
  const localVideo = document.getElementById("local_video");
  if (myPeerConnection) {
    myPeerConnection.ontrack = null;
    myPeerConnection.onremovetrack = null;
    myPeerConnection.onremovestream = null;
    myPeerConnection.onicecandidate = null;
    myPeerConnection.oniceconnectionstatechange = null;
    myPeerConnection.onsignalingstatechange = null;
    myPeerConnection.onicegatheringstatechange = null;
    myPeerConnection.onnegotiationneeded = null;
    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
    }
    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach((track) => track.stop());
    }
    myPeerConnection.close();
    myPeerConnection = null;
  }
  remoteVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
  localVideo.removeAttribute("src");
  localVideo.removeAttribute("srcObject");
  document.getElementById("hangup-button").disabled = true;
  targetUsername = null;
}
```

<font style="color:rgb(0, 0, 0);">获取对两个</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素的引用后，我们检查是否存在 WebRTC 连接；如果存在，我们继续断开并关闭呼叫：</font>

1. <font style="color:rgb(0, 0, 0);">所有事件处理程序都被移除。这可以防止在连接关闭过程中触发杂散的事件处理程序，可能导致错误。</font>
2. **<font style="color:rgb(0, 0, 0);"></font>**<font style="color:rgb(0, 0, 0);">对于远程和本地视频流，我们遍历每个</font>**<font style="color:rgb(0, 0, 0);">轨道 (track)</font>**<font style="color:rgb(0, 0, 0);">，调用 </font>`[MediaStreamTrack.stop()](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop)`<font style="color:rgb(0, 0, 0);">方法来关闭每个轨道。</font>
3. <font style="color:rgb(0, 0, 0);"></font><font style="color:rgb(0, 0, 0);">通过调用 </font>`[myPeerConnection.close()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/close)`<font style="color:rgb(0, 0, 0);">关闭 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">。</font>
4. <font style="color:rgb(0, 0, 0);"></font><font style="color:rgb(0, 0, 0);">将 </font>`<font style="color:rgb(0, 0, 0);">myPeerConnection</font>`<font style="color:rgb(0, 0, 0);">设置为 </font>`<font style="color:rgb(0, 0, 0);">null</font>`<font style="color:rgb(0, 0, 0);">，确保我们的代码知道没有正在进行的呼叫；当用户在用户列表中点击一个名称时，这很有用。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">然后对于传入和传出的 </font>`<font style="color:rgb(0, 0, 0);"><video></font>`<font style="color:rgb(0, 0, 0);">元素，我们使用它们的 </font>`<font style="color:rgb(0, 0, 0);">removeAttribute()</font>`<font style="color:rgb(0, 0, 0);">方法移除它们的 </font>`<font style="color:rgb(0, 0, 0);">src</font>`<font style="color:rgb(0, 0, 0);">和 </font>`<font style="color:rgb(0, 0, 0);">srcObject</font>`<font style="color:rgb(0, 0, 0);">属性。这完成了流与视频元素的分离。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">最后，我们将 "Hang Up" 按钮的 </font>`<font style="color:rgb(0, 0, 0);">disabled</font>`<font style="color:rgb(0, 0, 0);">属性设置为 </font>`<font style="color:rgb(0, 0, 0);">true</font>`<font style="color:rgb(0, 0, 0);">，使其在没有通话进行时不可点击；然后我们将 </font>`<font style="color:rgb(0, 0, 0);">targetUsername</font>`<font style="color:rgb(0, 0, 0);">设置为 </font>`<font style="color:rgb(0, 0, 0);">null</font>`<font style="color:rgb(0, 0, 0);">，因为我们不再与任何人通话。这允许用户呼叫另一个用户，或接收传入呼叫。</font>

---

#### <font style="color:rgb(0, 0, 0);">处理状态变化 (Dealing with state changes)</font>
<font style="color:rgb(0, 0, 0);">还有一些额外的事件，您可以设置侦听器来通知您的代码各种状态变化。我们使用其中三个：</font>`<font style="color:rgb(0, 0, 0);">iceconnectionstatechange</font>`<font style="color:rgb(0, 0, 0);">、</font>`<font style="color:rgb(0, 0, 0);">icegatheringstatechange</font>`<font style="color:rgb(0, 0, 0);">和</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">signalingstatechange</font>`<font style="color:rgb(0, 0, 0);">。</font>

---

#### <font style="color:rgb(0, 0, 0);">ICE 连接状态 (ICE connection state)</font>
<font style="color:rgb(0, 0, 0);">当连接状态发生变化（例如当呼叫从另一端终止）时，ICE 层会向 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">发送 </font>`[iceconnectionstatechange](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceconnectionstatechange_event)`<font style="color:rgb(0, 0, 0);">事件。</font>

```javascript
function handleICEConnectionStateChangeEvent(event) {
  switch (myPeerConnection.iceConnectionState) {
    case "closed":
    case "failed":
      closeVideoCall();
      break;
  }
}
```

<font style="color:rgb(0, 0, 0);">在这里，当 </font>**<font style="color:rgb(0, 0, 0);">ICE 连接状态 (ICE connection state)</font>**<font style="color:rgb(0, 0, 0);"> 变为 "closed" 或 "failed" 时，我们应用</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">closeVideoCall()</font>`<font style="color:rgb(0, 0, 0);">函数。这处理关闭我们这一端的连接，以便我们准备好再次开始或接受呼叫。</font>

> **<font style="color:rgba(0, 0, 0, 0.4);">注意：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 我们这里不监视 "disconnected" </font>**<font style="color:rgba(0, 0, 0, 0.4);">信令状态 (signaling state)</font>**<font style="color:rgba(0, 0, 0, 0.4);">，因为它可能表示临时问题，并且可能在一段时间后恢复到 "connected" 状态。监视它会在任何临时网络问题上关闭视频通话。</font>
>

<font style="color:rgba(0, 0, 0, 0.4);"></font>

---

#### <font style="color:rgb(0, 0, 0);">ICE 信令状态 (ICE signaling state)</font>
<font style="color:rgb(0, 0, 0);">类似地，我们监视 </font>`[signalingstatechange](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/signalingstatechange_event)`<font style="color:rgb(0, 0, 0);">事件。如果信令状态变为 "closed"，我们同样关闭呼叫。</font>

```javascript
function handleSignalingStateChangeEvent(event) {
  switch (myPeerConnection.signalingState) {
    case "closed":
      closeVideoCall();
      break;
  }
}
```

> **<font style="color:rgba(0, 0, 0, 0.4);">注意：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> "closed" 信令状态已被弃用，取而代之的是 "closed" iceConnectionState。我们在这里监视它只是为了增加一点向后兼容性。</font>
>

---

#### <font style="color:rgb(0, 0, 0);">ICE 收集状态 (ICE gathering state)</font>
`[icegatheringstatechange](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event)`<font style="color:rgb(0, 0, 0);">事件用于让您知道 </font>**<font style="color:rgb(0, 0, 0);">ICE 候选地址收集 (ICE candidate gathering)</font>**<font style="color:rgb(0, 0, 0);"> 过程状态何时发生变化。我们的示例没有将其用于任何用途，但调试时监视这些事件可能很有用，也可以检测候选地址收集何时完成。</font>

```javascript
function handleICEGatheringStateChangeEvent(event) {
  // 我们的示例只是在此处将信息记录到控制台，
  // 但您可以做任何您需要的事情。
}
```

---

**<font style="color:rgb(0, 0, 0);"></font>**

## <font style="color:rgb(0, 0, 0);">使用 WebRTC 数据通道 (Using WebRTC data channels)</font>
<font style="color:rgb(0, 0, 0);">在本指南中，我们将探讨如何向</font>**<font style="color:rgb(0, 0, 0);">对等连接 (peer connection)</font>**<font style="color:rgb(0, 0, 0);"> 添加一个</font>**<font style="color:rgb(0, 0, 0);">数据通道 (</font>**[**data channel**](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel)**<font style="color:rgb(0, 0, 0);">)</font>**<font style="color:rgb(0, 0, 0);">，该通道随后可用于安全地交换</font>**<font style="color:rgb(0, 0, 0);">任意数据 (arbitrary data)</font>**<font style="color:rgb(0, 0, 0);">；即我们希望的任何类型的数据，采用我们选择的任何格式。</font>

> **<font style="color:rgba(0, 0, 0, 0.4);">注意：</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 由于所有 WebRTC 组件都必须使用</font>**<font style="color:rgba(0, 0, 0, 0.4);">加密 (encryption)</font>**<font style="color:rgba(0, 0, 0, 0.4);">，因此在 </font>`<font style="color:rgba(0, 0, 0, 0.4);">RTCDataChannel</font>`<font style="color:rgba(0, 0, 0, 0.4);">上传输的任何数据都会自动使用</font>**<font style="color:rgba(0, 0, 0, 0.4);">数据报传输层安全性 (Datagram Transport Layer Security - DTLS)</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 进行保护。有关更多信息，请参阅下面的</font>**<font style="color:rgba(0, 0, 0, 0.4);">安全 (Security)</font>**<font style="color:rgba(0, 0, 0, 0.4);"> 部分。</font>
>

**<font style="color:rgb(0, 0, 0);">创建数据通道 (Creating a data channel)</font>**

`<font style="color:rgb(0, 0, 0);">RTCDataChannel</font>`<font style="color:rgb(0, 0, 0);">使用的底层</font>**<font style="color:rgb(0, 0, 0);">数据传输 (data transport)</font>**<font style="color:rgb(0, 0, 0);"> 可以通过以下两种方式之一创建：</font>

1. **<font style="color:rgb(0, 0, 0);">让 WebRTC 创建传输通道并为您将其通知给远程对等端 (Let WebRTC create the transport and announce it to the remote peer for you)</font>**<font style="color:rgb(0, 0, 0);">（通过使其接收一个 </font>`<font style="color:rgb(0, 0, 0);">datachannel</font>`**<font style="color:rgb(0, 0, 0);">事件 (event)</font>**<font style="color:rgb(0, 0, 0);">）。这是简单的方法，适用于多种用例，但可能不够灵活以满足您的需求。</font>
2. **<font style="color:rgb(0, 0, 0);">编写自己的代码来协商数据传输 (Write your own code to negotiate the data transport)</font>**<font style="color:rgb(0, 0, 0);"> 并编写自己的代码向另一个对等端发出信号，告知其需要连接到新通道。</font>

<font style="color:rgb(0, 0, 0);">让我们看看每种情况，从最常见的第一种开始。</font>

---

### <font style="color:rgb(0, 0, 0);">自动协商 (Automatic negotiation)</font>
<font style="color:rgb(0, 0, 0);">通常，您可以允许</font>**<font style="color:rgb(0, 0, 0);">对等连接 (peer connection)</font>**<font style="color:rgb(0, 0, 0);"> 为您处理协商</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCDataChannel</font>`<font style="color:rgb(0, 0, 0);">连接。为此，调用</font><font style="color:rgb(0, 0, 0);"> </font>`[createDataChannel()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel)`<font style="color:rgb(0, 0, 0);">时</font>**<font style="color:rgb(0, 0, 0);">不指定 (without specifying)</font>**<font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">negotiated</font>`**<font style="color:rgb(0, 0, 0);">属性 (property)</font>**<font style="color:rgb(0, 0, 0);"> 的值，或者将该属性指定为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">false</font>`<font style="color:rgb(0, 0, 0);">。这将自动触发</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">为您处理协商，导致远程对等端创建一个数据通道，并通过网络将两者链接在一起。</font>

<font style="color:rgb(0, 0, 0);"></font>

`<font style="color:rgb(0, 0, 0);">RTCDataChannel</font>`<font style="color:rgb(0, 0, 0);">对象由 </font>`<font style="color:rgb(0, 0, 0);">createDataChannel()</font>`**<font style="color:rgb(0, 0, 0);">立即返回 (returned immediately)</font>**<font style="color:rgb(0, 0, 0);">；您可以通过监视 </font>`[open](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/open_event)`<font style="color:rgb(0, 0, 0);">事件是否发送到 </font>`<font style="color:rgb(0, 0, 0);">RTCDataChannel</font>`<font style="color:rgb(0, 0, 0);">来判断连接是否已成功建立。</font>

```javascript
let dataChannel = pc.createDataChannel("MyApp Channel");

dataChannel.addEventListener("open", (event) => {
  beginTransmission(dataChannel); // 开始传输
});
```

---

### <font style="color:rgb(0, 0, 0);">手动协商 (Manual negotiation)</font>
<font style="color:rgb(0, 0, 0);">要手动协商数据通道连接，您需要首先在</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">上使用</font><font style="color:rgb(0, 0, 0);"> </font>`[createDataChannel()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel)`<font style="color:rgb(0, 0, 0);">方法创建一个新的</font><font style="color:rgb(0, 0, 0);"> </font>`[RTCDataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel)`<font style="color:rgb(0, 0, 0);">对象，在 </font>**<font style="color:rgb(0, 0, 0);">options</font>**<font style="color:rgb(0, 0, 0);"> 中指定</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">negotiated</font>`<font style="color:rgb(0, 0, 0);">属性设置为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">true</font>`<font style="color:rgb(0, 0, 0);">。这向对等连接发出信号，指示其不要代表您尝试协商通道。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">然后，使用 </font>**<font style="color:rgb(0, 0, 0);">Web 服务器 (web server)</font>**<font style="color:rgb(0, 0, 0);"> 或其他方式</font>**<font style="color:rgb(0, 0, 0);">带外协商 (negotiate out-of-band)</font>**<font style="color:rgb(0, 0, 0);"> 连接。此过程应通知远程对等端，它应使用相同的 </font>`[id](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/id)`<font style="color:rgb(0, 0, 0);">创建其自己的 </font>`<font style="color:rgb(0, 0, 0);">RTCDataChannel</font>`<font style="color:rgb(0, 0, 0);">，并将 </font>`<font style="color:rgb(0, 0, 0);">negotiated</font>`<font style="color:rgb(0, 0, 0);">属性也设置为 </font>`<font style="color:rgb(0, 0, 0);">true</font>`<font style="color:rgb(0, 0, 0);">。这将通过 </font>`<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>`<font style="color:rgb(0, 0, 0);">将两个对象链接起来。</font>

```javascript
let dataChannel = pc.createDataChannel("MyApp Channel", {
  negotiated: true,
});

dataChannel.addEventListener("open", (event) => {
  beginTransmission(dataChannel); // 开始传输
});

requestRemoteChannel(dataChannel.id); // 请求远程通道
```

<font style="color:rgb(0, 0, 0);">在此代码片段中，通道创建时</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">negotiated</font>`<font style="color:rgb(0, 0, 0);">设置为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">true</font>`<font style="color:rgb(0, 0, 0);">，然后使用名为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">requestRemoteChannel()</font>`<font style="color:rgb(0, 0, 0);">的函数触发协商，以创建具有与本地通道相同 </font>**<font style="color:rgb(0, 0, 0);">ID</font>**<font style="color:rgb(0, 0, 0);"> 的远程通道。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">这样做可以让您使用不同的属性为每个对等端创建数据通道，并通过为</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">id</font>`<font style="color:rgb(0, 0, 0);">使用相同的值来</font>**<font style="color:rgb(0, 0, 0);">声明式地创建 (create declaratively)</font>**<font style="color:rgb(0, 0, 0);"> 通道。</font>

---

### <font style="color:rgb(0, 0, 0);">缓冲 (Buffering)</font>
<font style="color:rgb(0, 0, 0);">WebRTC 数据通道支持</font>**<font style="color:rgb(0, 0, 0);">出站数据 (outbound data)</font>**<font style="color:rgb(0, 0, 0);"> 的</font>**<font style="color:rgb(0, 0, 0);">缓冲 (buffering)</font>**<font style="color:rgb(0, 0, 0);">。这是</font>**<font style="color:rgb(0, 0, 0);">自动处理 (handled automatically)</font>**<font style="color:rgb(0, 0, 0);"> 的。虽然无法控制</font>**<font style="color:rgb(0, 0, 0);">缓冲区的大小 (size of the buffer)</font>**<font style="color:rgb(0, 0, 0);">，但您可以了解当前缓冲了多少数据，并且可以选择在缓冲区中排队的</font>**<font style="color:rgb(0, 0, 0);">数据开始不足 (starts to run low)</font>**<font style="color:rgb(0, 0, 0);"> 时通过事件收到通知。这使得编写高效的例程变得容易，确保始终有数据准备好发送，而不会过度使用内存或完全淹没通道。</font>

<font style="color:rgb(0, 0, 0);"></font>

### <font style="color:rgb(0, 0, 0);">理解消息大小限制 (Understanding message size limits)</font>
<font style="color:rgb(0, 0, 0);">您应保持</font>**<font style="color:rgb(0, 0, 0);">消息大小 (message sizes)</font>**<font style="color:rgb(0, 0, 0);"> 适度小。虽然大多数现代浏览器支持发送至少 </font>**<font style="color:rgb(0, 0, 0);">256 千字节 (kilobytes)</font>**<font style="color:rgb(0, 0, 0);"> 的消息，但发送大消息有缺点，尤其是在</font>**<font style="color:rgb(0, 0, 0);">消息交错 (message interleaving)</font>**<font style="color:rgb(0, 0, 0);"> 不可用时。如果没有消息交错（如 [</font>[RFC 8260](https://datatracker.ietf.org/doc/html/rfc8260)<font style="color:rgb(0, 0, 0);">] 中所定义），在一个数据通道上发送大消息可能会导致</font>**<font style="color:rgb(0, 0, 0);">队头阻塞 (head-of-line blocking)</font>**<font style="color:rgb(0, 0, 0);">，这反过来会对其他数据通道上的消息</font>**<font style="color:rgb(0, 0, 0);">延迟 (latency)</font>**<font style="color:rgb(0, 0, 0);"> 产生负面影响。</font>

<font style="color:rgb(0, 0, 0);"></font>

<font style="color:rgb(0, 0, 0);">可以使用 </font>**<font style="color:rgb(0, 0, 0);">SDP 属性 (SDP attribute)</font>**<font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">max-message-size</font>`<font style="color:rgb(0, 0, 0);">（在 [RFC 8841] 中定义）来协商</font>**<font style="color:rgb(0, 0, 0);">最大消息大小 (maximum message size)</font>**<font style="color:rgb(0, 0, 0);">。此属性允许每个对等端声明其愿意接收的 </font>**<font style="color:rgb(0, 0, 0);">SCTP 用户消息 (SCTP user message)</font>**<font style="color:rgb(0, 0, 0);"> 的最大大小。通过协商此值，端点可以避免发送大于对等端可以处理的消息。如果 SDP 中不存在</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">max-message-size</font>`<font style="color:rgb(0, 0, 0);">属性，则假定默认值为 </font>**<font style="color:rgb(0, 0, 0);">64 千字节</font>**<font style="color:rgb(0, 0, 0);">。值为 </font>**<font style="color:rgb(0, 0, 0);">0</font>**<font style="color:rgb(0, 0, 0);"> 表示端点可以处理任意大小的消息，仅受可用内存限制。</font>

### <font style="color:rgb(0, 0, 0);">安全 (Security)</font>
<font style="color:rgb(0, 0, 0);">所有使用 WebRTC 传输的数据都是</font>**<font style="color:rgb(0, 0, 0);">加密的 (encrypted)</font>**<font style="color:rgb(0, 0, 0);">。对于</font><font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">RTCDataChannel</font>`<font style="color:rgb(0, 0, 0);">，使用的加密是</font>**<font style="color:rgb(0, 0, 0);">数据报传输层安全性 (Datagram Transport Layer Security - DTLS)</font>**<font style="color:rgb(0, 0, 0);">，它基于</font>**<font style="color:rgb(0, 0, 0);">传输层安全性 (</font>**[**Transport Layer Security**](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security)**<font style="color:rgb(0, 0, 0);"> - TLS)</font>**<font style="color:rgb(0, 0, 0);">。由于 TLS 用于保护每个 </font>**<font style="color:rgb(0, 0, 0);">HTTPS 连接 (HTTPS connection)</font>**<font style="color:rgb(0, 0, 0);">，因此您在数据通道上发送的任何数据都与用户浏览器发送或接收的任何其他数据一样安全。</font>

<font style="color:rgb(0, 0, 0);">更根本的是，由于 WebRTC 是两个</font>**<font style="color:rgb(0, 0, 0);">用户代理 (user agents)</font>**<font style="color:rgb(0, 0, 0);"> 之间的</font>**<font style="color:rgb(0, 0, 0);">点对点连接 (peer-to-peer connection)</font>**<font style="color:rgb(0, 0, 0);">，因此数据永远不会经过 </font>**<font style="color:rgb(0, 0, 0);">Web 或应用程序服务器 (web or application server)</font>**<font style="color:rgb(0, 0, 0);">。这减少了数据被拦截的机会。</font>

<font style="color:rgb(0, 0, 0);"></font>

---

## <font style="color:rgb(0, 0, 0);">总结&QA</font>


### webRTC中每个peer都需要设置本地和远程SD
**<font style="color:rgb(0, 0, 0);">在 WebRTC 中，每个 PeerConnection (</font>**`**<font style="color:rgb(0, 0, 0);">RTCPeerConnection</font>**`**<font style="color:rgb(0, 0, 0);">对象) 都需要设置 </font>**_**<font style="color:rgb(0, 0, 0);">本地描述</font>**_**<font style="color:rgb(0, 0, 0);">(</font>**`**<font style="color:rgb(0, 0, 0);">localDescription</font>**`**<font style="color:rgb(0, 0, 0);">) 和 </font>**_**<font style="color:rgb(0, 0, 0);">远程描述</font>**_**<font style="color:rgb(0, 0, 0);">(</font>**`**<font style="color:rgb(0, 0, 0);">remoteDescription</font>**`**<font style="color:rgb(0, 0, 0);">)。</font>**<font style="color:rgb(0, 0, 0);"> 这是实现两个浏览器（Peer）之间协商并建立点对点连接的基础。</font>

`<font style="color:rgb(0, 0, 0);">localDescription</font>`<font style="color:rgb(0, 0, 0);">代表</font>**<font style="color:rgb(0, 0, 0);">我</font>**<font style="color:rgb(0, 0, 0);">提出的或者最终确认的连接配置（SDP）。</font>

`<font style="color:rgb(0, 0, 0);">remoteDescription</font>`<font style="color:rgb(0, 0, 0);">代表</font>**<font style="color:rgb(0, 0, 0);">对方</font>**<font style="color:rgb(0, 0, 0);">提出或者最终确认的连接配置（SDP）。</font>

<font style="color:rgb(0, 0, 0);"></font>

**<font style="color:rgb(0, 0, 0);">必须成对设置：</font>**<font style="color:rgb(0, 0, 0);"> 一个 PeerConnection 需要同时知道自己的配置 (</font>`<font style="color:rgb(0, 0, 0);">localDescription</font>`<font style="color:rgb(0, 0, 0);">) 和对方的配置 (</font>`<font style="color:rgb(0, 0, 0);">remoteDescription</font>`<font style="color:rgb(0, 0, 0);">) 才能完成协商并建立连接。</font>

**<font style="color:rgb(0, 0, 0);">发起方流程：</font>**

+ `<font style="color:rgb(0, 0, 0);">setLocalDescription(offer)</font>`<font style="color:rgb(0, 0, 0);">-> 发送 Offer -> 收到 Answer -> </font>`<font style="color:rgb(0, 0, 0);">setRemoteDescription(answer)</font>`

**<font style="color:rgb(0, 0, 0);">接收方流程：</font>**

+ <font style="color:rgb(0, 0, 0);">收到 Offer -> </font>`<font style="color:rgb(0, 0, 0);">setRemoteDescription(offer)</font>`<font style="color:rgb(0, 0, 0);">-> </font>`<font style="color:rgb(0, 0, 0);">setLocalDescription(answer)</font>`<font style="color:rgb(0, 0, 0);">-> 发送 Answer</font>

<font style="color:rgb(0, 0, 0);"></font>

### <font style="color:rgb(0, 0, 0);">DataChannel有很小的大小限制是怎么传输stream的</font>
+ <font style="color:rgb(0, 0, 0);">实时音视频传输：使用 </font>`<font style="color:rgb(0, 0, 0);">addTrack()</font>`<font style="color:rgb(0, 0, 0);">+ 内置SRTP传输</font>
+ <font style="color:rgb(0, 0, 0);"> 传输大型文件：</font>**<font style="color:rgb(0, 0, 0);">使用DataChannel传输，并进行切片处理和重组</font>**

