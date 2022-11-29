let PeerArray= []
let localPeer, remotePeer;
let localDc, remoteDc;
let param ={audio: true, video: false}

async function newCreate(){
    setSdp.style.display = "block"
    createOrjoin.style.display = 'block'
}

async function doOfferOrAnswer(){
    // await createNewPeer()
    await start()
}

function createNewPeer(){
    console.warn("create new peer")
    if(pc1){
        localPeer = new RTCPeerConnection();
        localPeer.onicecandidate = function (event){
            handlePeerCandidate(event.candidate, localPeer)
        }
        // localPeer.addEventListener("icecandidate", e => onIceCandidate(localPeer, e))
        localPeer.onaddstream = function(e){
            console.log('handOnaddsteam, Got remote stream', e.stream)
            localPeer.remoteStream = e.stream
            var audios = document.getElementsByTagName('audio')[1]
            var audio = document.createElement('audio')
            audio.autoplay = true
            audio.srcObject = e.stream
            // audios.appendChild(audio)
        }
    }else if(pc2){
        remotePeer = new RTCPeerConnection();
        remotePeer.onicecandidate = function (event){
            handlePeerCandidate(event.candidate, remotePeer, 'pc2: ', 'local')
        };

        // remotePeer.addEventListener("icecandidate", e=> onIceCandidate(remotePeer,e))
        remotePeer.onaddstream = function(e){
            console.log('handOnaddsteam, Got remote stream', e.stream)
            remotePeer.remoteStream = e.stream
            var audios = document.getElementsByTagName('audio')[1]
            var audio = document.createElement('audio')
            audio.autoplay = true
            audio.srcObject = e.stream
            audios.appendChild(audio)
        }
    }
    // localPeer = new RTCPeerConnection();
    // remotePeer = new RTCPeerConnection();



}

async function handleCreateOfferSuccess(desc, pc) {
    console.info('start setLocalDescription')
    try {
        desc = dealWithSdp(desc)
        console.info(`modify Offer setLocalDescription sdp: ` + ` \n${desc.sdp}`)
        await pc.setLocalDescription(desc)
        setLocalDescriptionSuccess(pc)
    } catch (error) {
        console.error('Failed to create setLocalDescription description: ', e);
    }
    function setLocalDescriptionSuccess(pc) {
        console.info('setLocalDescription success ')
        if (pc.iceGatheringState === 'complete') {
            console.info('onSetLocalDescriptionSuccess send invite( PC: ' + pc.type + ' )')
        }
    }
}



async function gotStream(stream) {
    console.log('Received local stream');
    // var audios = document.getElementsByTagName('audio')[0]
    // var audio = document.createElement('audio')
    // audio.srcObject = stream
    // audio.play();
    // // audios.appendChild(audio)
    // localPeer.addStream(stream)
    createDatachannel(localPeer)

    if(localPeer){
        try{
            let offer = await localPeer.createOffer()
            console.info(`Offer setLocalDescription sdp111: ` + ` \n${offer.sdp}`)
            await handleCreateOfferSuccess(offer, localPeer)
            console.info(`Offer setLocalDescription sdp: ` + ` \n${offer.sdp}`)
        }catch(e){
            console.error('Failed to create setLocalDescription description: ', e);
        }
    }
}

function start() {
    console.log('Requesting local stream');
    localPeer = new RTCPeerConnection();
    // navigator.getUserMedia(constraints,function(stream){
    //     gotStream(stream)
    // },function(e){
    //     console.warn("error:",e)
    // })
    // navigator.getUserMedia({param}).then(gotStream).catch(e => console.error('getUserMedia() error: ', e));
    gotStream()
    localPeer.onicecandidate = function (event){
        handlePeerCandidate(event.candidate, localPeer)
    }
    // localPeer.addEventListener("icecandidate", e => onIceCandidate(localPeer, e))
    localPeer.onaddstream = function(e){
        console.log('handOnaddsteam, Got remote stream', e.stream)
        localPeer.remoteStream = e.stream
        var audios = document.getElementsByTagName('audio')[1]
        var audio = document.createElement('audio')
        audio.autoplay = true
        audio.srcObject = e.stream
    }
}


function handlePeerCandidate(event, pc) {
    // dest.addIceCandidate(candidate).then(onAddIceCandidateSuccess, onAddIceCandidateError);
    // console.log(`${prefix}New ${type} ICE candidate: ${candidate ? candidate.candidate : '(null)'}`);
    console.log(`${getOthersPc(pc)} addIceCandidate success`);
    if (event === null) {
        let sdp = pc.localDescription
        if(pc === localPeer){
            /******弹框处理,显示本地pc1 sdp进行交换*****/
            localOffer.innerText = JSON.stringify(sdp)
        }else if(pc === remotePeer){
            /******弹框处理,显示本地pc2 sdp进行交换*****/
            localAnswer.innerText = JSON.stringify(sdp)
        }
    }
}

function getNames(pc) {
    return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOthersPc(pc) {
    return pc === localPeer ? remotePeer : localPeer
}

function createDatachannel(pc) {
    try {
        localDc = pc.createDataChannel('dataChannel', {reliable: true});
        console.log("Channel [ " + localDc.label + " ] created!");
        console.log(pc.label+" Datachannel state: "+ pc.readyState);
    }
    catch (dce) {
        console.log("dc established error: "+dce.message);
    }

    dataChannelEvents(localDc);
}

function dataChannelEvents(channel) {

    channel.onopen = function () {
        console.log("Datachannel opened, current stateis :\n" + localDc.readyState);
        console.log(channel);
    };

    channel.onmessage = function (event) {
        console.log("Received message:"+ event.data);
        handleGetMessage(this,e)
        if(size){
            receiveProgress.max = size;
        }
        // var li = document.createElement('li');
        // li.innerHTML = 'Friend: '+event.data;
        // firstPeerOutput.appendChild(li);
    };

    channel.onerror = function (err) {
        console.log("Datachannel Error: "+err);
    }

    channel.onclose = function () {
        console.log("DataChannel is closed");
    }
}
