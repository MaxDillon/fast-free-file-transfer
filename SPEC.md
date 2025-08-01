# Peer-to-Peer Encrypted Connection for File Transfer

## 1. Introduction
The goal is to establish a secure and direct peer-to-peer connection between two web browsers to facilitate file transfer. The website itself will be completely static, served directly from HTML and JavaScript files, with no backend server components for the file transfer logic.

## 2. Core Technology: WebRTC
WebRTC (Web Real-Time Communication) is the primary technology that will be used. It enables real-time communication capabilities directly within web browsers, allowing for audio, video, and arbitrary data exchange without requiring an intermediary server once the connection is established.

### Built-in Encryption
A critical feature of WebRTC is its inherent security. All WebRTC connections are encrypted by default:
*   **DTLS (Datagram Transport Layer Security):** Used to secure the initial signaling handshake and establish a secure channel for SRTP.
*   **SRTP (Secure Real-time Transport Protocol):** Used to encrypt and authenticate the actual media (or data in our case, for file transfer) exchanged over the peer-to-peer connection.

## 3. Connection Establishment Process (WebRTC Signaling)

While WebRTC enables direct peer-to-peer communication, an initial "signaling" phase is required to exchange network information and session descriptions between the peers. This phase allows the browsers to discover each other and negotiate the connection parameters.

### 3.1. Signaling
Signaling is the process of exchanging metadata necessary to set up a WebRTC connection. This metadata includes:
*   **Session Description Protocol (SDP) Offers and Answers:** These describe the capabilities of each peer (e.g., supported codecs, IP addresses, ports). One peer creates an "offer," and the other responds with an "answer."
*   **ICE Candidates (Interactive Connectivity Establishment):** These are network addresses (IP and port combinations) that each peer can use to communicate. Peers exchange these candidates to find the best possible path for a direct connection, including local IPs, public IPs, and relayed addresses.

### 3.2. NAT Traversal (STUN/TURN)
Network Address Translators (NATs) and firewalls can prevent direct peer-to-peer connections. WebRTC uses STUN and TURN servers to overcome these challenges:
*   **STUN (Session Traversal Utilities for NAT):** A STUN server helps peers discover their public IP address and port behind a NAT. This allows them to inform other peers of their accessible addresses. Public STUN servers are widely available and often sufficient for establishing direct connections.
*   **TURN (Traversal Using Relays around NAT):** If a direct (peer-to-peer) connection cannot be established (e.g., due to restrictive NATs or firewalls), a TURN server acts as a relay. Both peers send their data to the TURN server, which then forwards it to the other peer. While effective, using a TURN server consumes bandwidth and introduces a hop, making it a less preferred but sometimes necessary fallback.

### 3.3. Direct Connection
Once the signaling messages (SDPs and ICE candidates) have been exchanged and processed, WebRTC attempts to establish a direct peer-to-peer connection using the discovered network paths. If successful, data can then flow directly between the browsers, bypassing any intermediary servers for the actual file transfer.

## 4. Addressing the "Static Website" Constraint for Signaling

The primary challenge for a "completely static" website is the signaling phase, which typically requires a server to facilitate the exchange of SDPs and ICE candidates between peers. Since the goal is "no server at all" for the application itself, we must consider how to handle signaling.

### Option 1: Manual Signaling (Impractical for User Experience)
*   **Description:** Peers manually exchange the SDP offers/answers and ICE candidates. This could involve one user generating an SDP offer, copying it, sending it to the other user via an external channel (e.g., chat, email), and the other user pasting it into their browser, generating an answer, and sending it back.
*   **Pros:** Truly "no server" involved.
*   **Cons:** Extremely poor user experience, error-prone, and not suitable for a practical application.

### Option 2: Leveraging a Minimal, External Signaling Mechanism (Recommended)
*   **Description:** While the file transfer itself will be direct peer-to-peer, a *very lightweight* external mechanism is almost always necessary for the initial signaling. This mechanism is *not* part of the static file transfer website's backend but rather a temporary facilitator for connection setup.
    *   **Public Signaling Service:** Utilize an existing, freely available signaling service if one meets security and reliability requirements.
    *   **Minimal WebSockets Signaling Server:** Deploy a tiny, dedicated WebSockets server purely for signaling purposes. This server would only relay the SDPs and ICE candidates and would not handle any file transfer logic or persistent data. It could be hosted on a free tier service or a very low-cost VPS. This is the most common and practical approach for WebRTC applications that aim for a "serverless" *data transfer* experience.
*   **Pros:** Provides a significantly better user experience, automates the signaling process, and still keeps the actual file transfer decentralized and direct. The "server" component is minimal and only for setup.
*   **Cons:** Introduces a minimal external dependency for initial connection setup, slightly deviating from a "purely static" definition but providing a functional solution.

**Decision:** We will proceed with **Option 2**, aiming to use a minimal, external signaling mechanism (likely a simple WebSockets server) to enable a practical and user-friendly experience while maintaining the "no server" philosophy for the actual file transfer data.

## 5. Next Steps

1.  Set up a SolidJS project structure.
2.  Implement WebRTC `RTCPeerConnection` in SolidJS components.
3.  Integrate a WebSocket client for signaling.
4.  Handle `RTCDataChannel` for transferring file data.
5.  Implement UI for file selection, connection status, and transfer progress. 