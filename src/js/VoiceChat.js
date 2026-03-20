export class VoiceChat {
    constructor(socket) {
        this.socket = socket;
        this.localStream = null;
        this.peers = {}; // socket.id -> RTCPeerConnection
        this.isMuted = false;
        
        // Listeners do WebRTC Signaling
        this.socket.on('webrtc_offer', this.handleOffer.bind(this));
        this.socket.on('webrtc_answer', this.handleAnswer.bind(this));
        this.socket.on('webrtc_ice_candidate', this.handleIceCandidate.bind(this));
        
        // Elemento para segurar os áudios
        this.audioContainer = document.createElement('div');
        this.audioContainer.id = 'voice-chat-audios';
        this.audioContainer.style.display = 'none';
        document.body.appendChild(this.audioContainer);
    }

    async joinVoiceChat() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            console.log("Acesso ao microfone concedido.");
            this.setMuted(this.isMuted);
            return true;
        } catch (err) {
            console.error("Erro ao acessar o microfone:", err);
            alert("Não foi possível acessar o microfone. Verifique as permissões.");
            return false;
        }
    }

    leaveVoiceChat() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        for (const peerId in this.peers) {
            this.removePeer(peerId);
        }
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
        }
    }

    toggleMute() {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }

    // Chamado quando um novo jogador entra (devemos iniciar a conexão se já estivermos no voice chat)
    async connectToPeer(peerId) {
        if (!this.localStream) return; // Se eu não estou com mic ativo, não inicio
        
        const peerConnection = this.createPeerConnection(peerId);
        this.peers[peerId] = peerConnection;

        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            this.socket.emit('webrtc_offer', { target: peerId, sdp: peerConnection.localDescription });
        } catch (err) {
            console.error("Erro ao criar oferta:", err);
        }
    }

    removePeer(peerId) {
        if (this.peers[peerId]) {
            this.peers[peerId].close();
            delete this.peers[peerId];
        }
        const audioElement = document.getElementById(`audio-${peerId}`);
        if (audioElement) {
            this.audioContainer.removeChild(audioElement);
        }
    }

    createPeerConnection(peerId) {
        // Servidores STUN públicos do Google
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        const peerConnection = new RTCPeerConnection(configuration);

        // Adiciona nossas tracks locais na conexão
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }

        // Quando recebemos candidatos ICE da rede, mandar para o peer
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                this.socket.emit('webrtc_ice_candidate', { target: peerId, candidate: event.candidate });
            }
        };

        // Quando o peer enviar tracks (áudio do outro jogador)
        peerConnection.ontrack = event => {
            let audioElement = document.getElementById(`audio-${peerId}`);
            if (!audioElement) {
                audioElement = document.createElement('audio');
                audioElement.id = `audio-${peerId}`;
                audioElement.autoplay = true;
                this.audioContainer.appendChild(audioElement);
            }
            if (audioElement.srcObject !== event.streams[0]) {
                audioElement.srcObject = event.streams[0];
                audioElement.play().catch(e => console.error("AutoPlay bloqueado:", e));
            }
        };

        return peerConnection;
    }

    async handleOffer(data) {
        if (!this.localStream) return; // Ignora se não estamos no chat de voz
        
        const senderId = data.sender;
        const peerConnection = this.createPeerConnection(senderId);
        this.peers[senderId] = peerConnection;

        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            this.socket.emit('webrtc_answer', { target: senderId, sdp: peerConnection.localDescription });
        } catch (err) {
            console.error("Erro ao responder oferta:", err);
        }
    }

    async handleAnswer(data) {
        const peerId = data.sender;
        const peerConnection = this.peers[peerId];
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } catch (err) {
                console.error("Erro ao setar remote description (answer):", err);
            }
        }
    }

    async handleIceCandidate(data) {
        const peerId = data.sender;
        const peerConnection = this.peers[peerId];
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
                console.error("Erro ao adicionar ICE candidate:", err);
            }
        }
    }
}
