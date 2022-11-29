let mb= document.createElement('div');
let body = document.getElementsByTagName('body')[0];
let selectEncoding = document.getElementsByClassName("selectEncoding")[0]
let createOrjoin = document.getElementsByClassName("createOrjoin")[0]
let setSdp = document.getElementsByClassName("setSdp")[0]
let isReceive = document.getElementsByClassName("isReceiveTips")[0]
let isReceiveText = document.getElementsByClassName("isReceive")[0]
let containerWrapper = document.getElementById("container_wrapper")

let localVideo = document.getElementById('localVideo')
let remoteVideo = document.getElementById('remoteVideo')
let presentHtml = document.getElementById('presentHtml')
let local_bytesSent = document.getElementById('local_bytesSent')

let presentRemoteHtml = document.getElementById('presentRemoteHtml')
let remote_bytesSent = document.getElementById('remote_bytesSent')


let showLocalOffer = document.getElementById("showLocalOffer")
let showLocalAnswer = document.getElementById("showLocalAnswer")
let getRemoteOffer = document.getElementById("getRemoteOffer")
let getRemoteAnswer = document.getElementById("getRemoteAnswer")

let localOffer = document.getElementById("localOffer")
let localAnswer = document.getElementById("localAnswer")
let remoteOffer = document.getElementById("remoteOffer")
let remoteAnswer = document.getElementById("remoteAnswer")

let offerSentBtn = document.getElementById("offerSentBtn")
let answerSentBtn = document.getElementById("answerSentBtn")
let offerRecdBtn = document.getElementById("offerRecdBtn")
let answerRecdBtn = document.getElementById("answerRecdBtn")

let messageTextBox = document.getElementById("messageTextBox")
let sendMessageBtn = document.getElementById("sendMessageBtn")

let chatLog = document.getElementById('chatlog')

let isCreateState
let config ={}, RTCpeerConnectionOptional = {'optional': [{'DtlsSrtpKeyAgreement': true}]}
let pc1, pc2, pc1DataChannel, pc2DataChannel
let constraints ={audio: true, video:false}

/**********************监听事件*************************/
offerSentBtn.onclick = function(){
    showLocalOffer.style.display = 'none'
    getRemoteAnswer.style.display = 'block'
}

answerSentBtn.onclick = function(){
    showLocalAnswer.style.display = 'none'
    containerWrapper.style.opacity = 1
    body.removeChild(mb);
    // getRemoteOffer.style.display = 'block'
}

offerRecdBtn.onclick = function(){
    getRemoteOffer.style.display = 'none'
    let offer = remoteOffer.value
    let offerDesc = new RTCSessionDescription(JSON.parse(offer))
    console.log('Received remote offer', offerDesc.sdp.toString())
    handleOfferFromPC1(offerDesc)

    showLocalAnswer.style.display = "block"
    // setInterval(function() { ReGetStats()},1000)
    // $('#showLocalAnswer').modal('show')
}

answerRecdBtn.onclick = function(){
    getRemoteAnswer.style.display = 'none'
    containerWrapper.style.opacity = 1
    var answer = remoteAnswer.value
    var answerDesc = new RTCSessionDescription(JSON.parse(answer))
    handleAnswerFromPC2(answerDesc)
    body.removeChild(mb);
    // setInterval(function() { ReGetStats()},1000)
}




/****************创建peerConnection***********/

function join(){
    function getSuccess(stream){
        pc2.localStream = stream
        streamMuteSwitch({stream: stream, type: 'audio', mute: true})
        pc2.addStream(stream)
        if(stream.getAudioTracks().length > 0){
            let video = handleReplaceElement('localVideo')
            video.srcObject = stream
            video.play()
        }

        // setInterval(function() {ReGetStats()},1000)
    }

    function getFailed(error){
        console.log('Error adding stream to pc2: ' + error)
    }

    if(!pc2){
        console.warn("join join join")
        try{
            pc2 = new RTCPeerConnection(config, RTCpeerConnectionOptional);
            // navigator.getUserMedia(constraints,function(stream){
            //     getSuccess(stream)
            // },function(e){
            //     getFailed(e)
            //     console.warn("error:",e)
            // })
            pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e));
            pc2.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc2, e));
            pc2.addEventListener('icegatheringstatechange',e=> onicegatheringstatechange(pc2,e))
            pc2.addEventListener("signalingstatechange", e=>onsignalingstatechange(pc2,e))
            pc2.onaddstream = handleOnaddremotestream
            pc2.ondatachannel =  function(e){
                var dataChannel = e.channel || e; // Chrome sends event, FF sends raw channel
                console.log('Received datachannel (pc2)', arguments)
                dataChannel.binaryType = 'arraybuffer';
                pc2DataChannel = dataChannel
                pc2DataChannel.onopen = function (e) {
                    console.log('(pc2dc) data channel connect')
                }
                pc2DataChannel.onmessage = function (e) {
                    handleGetMessage(this,e)
                    if(size){
                        receiveProgress.max = size;
                    }
                }

                receivedSize = 0;
                bitrateMax = 0;
                downloadAnchor.textContent = '';
                downloadAnchor.removeAttribute('download');
                if (downloadAnchor.href) {
                    URL.revokeObjectURL(downloadAnchor.href);
                    downloadAnchor.removeAttribute('href');
                }
            }
        }catch(e){
            console.warn("join: create peerconnection error")
        }

    }else{
        console.warn("33333333333333")
    }

    isCreateState = 'join'
    setSdp.style.display = "none"
    createOrjoin.style.display = 'none'
    getRemoteOffer.style.display = 'block'

}

function create(){
    isCreateState = 'create'
    setSdp.style.display = "none"
    createOrjoin.style.display = 'none'
    showLocalOffer.style.display = 'block'
    if(!pc1){
        console.warn("create create create")
        createLocalOffer()
    }else{
        doOfferOrAnswer()
    }
}

async function createLocalOffer() {

    function getFailed(error){
        console.log('Error adding stream to pc1: ' + error)
    }

    async function getSuccess(stream){
        // pc1.localStream = stream
        // streamMuteSwitch({stream: stream, type: 'audio', mute: true})
        // pc1.addStream(stream)
        await setupDataChannel()
        // if(stream.getAudioTracks().length > 0){
        //     let video = handleReplaceElement('localVideo')
        //     video.srcObject = stream
        //     video.play()
        // }

        try {
            let offer = await pc1.createOffer()
            await onCreateOfferSuccess(offer)
            console.info(`Offer setLocalDescription sdp: ` + ` \n${offer.sdp}`)
            console.info('setLocalDescription success')
        } catch (e) {
            console.error('Failed to create setLocalDescription description: ', e);
        }

        // setInterval(function() { LoGetStats()},1000)
    }

    async function onCreateOfferSuccess(desc) {
        console.info('start setLocalDescription')
        try {
            // desc = dealWithSdp(desc)
            console.info(`modify Offer setLocalDescription sdp: ` + ` \n${desc.sdp}`)
            await pc1.setLocalDescription(desc)
            setLocalDescriptionSuccess(pc1)
        } catch (error) {
            console.error('Failed to create setLocalDescription description: ', e);
        }
    }

    function setLocalDescriptionSuccess(pc) {
        console.info('setLocalDescription success ( ' + pc.type + ')')
        if (pc.iceGatheringState === 'complete') {
            console.info('onSetLocalDescriptionSuccess send invite( PC: ' + pc.type + ' )')
        }
    }

    try{
        pc1 = new RTCPeerConnection(config, RTCpeerConnectionOptional);
        // navigator.getUserMedia(constraints,function(stream){
        //     getSuccess(stream)
        // },function(e){
        //     getFailed(e)
        // })
        getSuccess()
    }catch(e){
        console.warn("create: create peerConnection error")
    }

    pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));
    pc1.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc1, e));
    pc1.addEventListener('icegatheringstatechange', e => onicegatheringstatechange(pc1, e))
    pc1.addEventListener("signalingstatechange", e => onsignalingstatechange(pc1, e))
    pc1.onconnection = handleOnconnection
    pc1.onaddstream = handleOnaddstream
}

async function handleOfferFromPC1 (offerDesc) {
    pc2.setRemoteDescription(offerDesc)
    try {
        const answer = await pc2.createAnswer();
        console.log('Created local answer: ', answer.sdp.toString())
        await gotRemoteDescription(answer);
    } catch (e) {
        console.log('Failed to create session description: ', e);
    }
}
async function gotRemoteDescription(desc) {
    desc = dealWithSdp(desc)
    console.info(`modify Answer from remoteConnection: ` + ` \n${desc.sdp}`)
    await pc2.setLocalDescription(desc);
    // setInterval(function() {ReGetStats()},1000)
}

function handleAnswerFromPC2 (answerDesc) {
    console.log('Received remote answer: ', answerDesc)
    // setInterval(function() { ReGetStats()},1000)
    writeToChatLog('Received remote answer', 'text-success')
    pc1.setRemoteDescription(answerDesc)
}

function handleOnconnection () {
    console.log('Datachannel connected')
    writeToChatLog('Datachannel connected', 'text-success')
}

function handleOnaddstream (e) {
    console.log('handOnaddsteam, Got remote stream', e.stream)
    pc1.remoteStream = e.stream
    let el = document.getElementById('remoteVideo')
    if(e.stream.getAudioTracks().length > 0){
        el =  handleReplaceElement('remoteVideo')
    }
    el.autoplay = true
    el.srcObject = e.stream
}

function handleOnaddremotestream(event){
    console.log('handleOnaddremotestream, Got remote stream', event.stream)
    pc2.remoteStream = event.stream
    let remoteVideo = document.getElementById('remoteVideo')
    if(event.stream.getAudioTracks().length > 0){
        remoteVideo = handleReplaceElement('remoteVideo')
    }
    remoteVideo.autoplay = true
    remoteVideo.srcObject = event.stream
}

/************************************处理sdp ********************************************/
function dealWithSdp(desc,leveId= '42e028'){
    let parsedSdp = SDPTools.parseSDP(desc.sdp)
    for(let i = 0; i < parsedSdp.media.length; i++){
        let media = parsedSdp.media[i]
        if (media.type === 'audio') {
            let codec = []
            let opus = localStorage.getItem('opus')
            let pcmu = localStorage.getItem('pcmu')
            if(opus === 'true'){
                codec.push('opus')
                console.warn("存在opus")
            }
            if(pcmu === 'true'){
                codec.push('PCMU')
                console.warn("存在pcmu")
            }
            codec.push('CN')  // only keep ['G722', 'opus', 'PCMU', 'PCMA', 'telephone-event']
            SDPTools.removeCodecByName(parsedSdp, i, codec, true)
        }else if(media.type === 'video'){
            let media = parsedSdp.media[i]
            let codec = ['VP9','VP8']
            SDPTools.removeCodecByName(parsedSdp, i, codec)
            SDPTools.setXgoogleBitrate(parsedSdp, 10240, i)
            SDPTools.setMediaBandwidth(parsedSdp, i, 2048)
            SDPTools.removeRembAndTransportCC(parsedSdp, i)
            console.warn("media_payloads:",media.payloads)

            /**修改levelId*/
            if(!leveId){
                console.warn("empty string")
                return
            }
            console.warn("设置的profile-level-id为： ", leveId)
            SDPTools.modifyProfilelevelId(parsedSdp,i,leveId)

            /**修改fmtp*/
            SDPTools.modifyFmtp(parsedSdp, i)

            /**修改ext*/
            SDPTools.modifyExt(parsedSdp, i)
        }
    }
    desc.sdp = SDPTools.writeSDP(parsedSdp)
    return  desc
}

/***********************************dataChannel相关处理*******************************/

function setupDataChannel(){
   try{
       pc1DataChannel = pc1.createDataChannel('sendDataChannel', {reliable: true, ordered: true})
       pc1DataChannel.binaryType = 'arraybuffer';
       console.log("created dataChannel (PC1)")
       pc1DataChannel.onopen = function(){
           console.log('(pc1)data channel connect')
       }
       pc1DataChannel.onmessage = function(e){
           console.log(`Got message (pc1) ${e.data}`)
           handleGetMessage(this,e)
           if(size){
               receiveProgress.max = size;
           }
       }
   }catch(e){
       console.warn('No data channel (pc1)', e);
   }
}

function handleReceiveMessage(event){
    onReceiveMessageCallback(event)
}
function onError(error) {
    if (sendChannel) {
        console.error('Error in sendChannel:', error);
        return;c
    }
    console.log('Error in sendChannel which is already closed:', error);
}

/*******************************ice 相关逻辑**************************************/

async function onIceCandidate(pc, event) {
    try {
        onAddIceCandidateSuccess(pc, event.candidate);
    } catch (e) {
        onAddIceCandidateError(pc, e);
    }
    console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onicegatheringstatechange (pc,state) {
    console.info(`${getName(pc)} ice gathering state change:, ${pc.iceGatheringState}`)
}

function onsignalingstatechange (pc, state) {
    console.info(`${getName(pc)} signaling state change:, ${pc.signalingState}`)
}

async function onAddIceCandidateSuccess(pc,event) {
    console.log(`${getOtherPc(pc)} addIceCandidate success`);
    if (event === null) {
        let sdp = pc.localDescription
        if(pc === pc1){
            /******弹框处理,显示本地pc1 sdp进行交换*****/
            localOffer.innerText = JSON.stringify(sdp)
        }else if(pc === pc2){
            /******弹框处理,显示本地pc2 sdp进行交换*****/
            localAnswer.innerText = JSON.stringify(sdp)
        }
    }
}

function onAddIceCandidateError(pc, error) {
    console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

function onIceStateChange(pc, event) {
    if (pc) {
        console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
        console.log('ICE state change event: ', event);
    }
}

function getDc(){
    if(isCreateState === 'join'){
        if(pc2DataChannel){
            return pc2DataChannel
        }else{
            return localDc
        }
        return pc2DataChannel
    }else if(isCreateState = 'create'){
        return pc1DataChannel
    }
}

function getName(pc) {
    return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
    return (pc === pc1) ? pc2 : pc1;
}


function sendMessage () {
    let value = messageTextBox.value
    if(value){
        name = null, size = null, type = null;
        receiveProgress.value = '';
        sendProgress.value = ''

        let dc = getDc()
        dc.send(JSON.stringify({method: 'message', message: value,}))

        writeToChatLog(value, 'text-success', true)
        messageTextBox.value = ''
    }
    return false
}


/***********************************对流进行处理*************************************************/
function streamMuteSwitch(data) {
    if (data.stream != null) {
        console.info('MuteStream: stream id = ' + data.stream.id)
    } else {
        console.warn('stream is not exist!')
        return
    }

    if (data && data.stream && data.type === 'audio' && data.stream.getAudioTracks().length > 0) {
        for (let i = 0; i < data.stream.getAudioTracks().length; i++) {
            if (data.mute) {
                if (data.stream.getAudioTracks()[i].enabled === true) {
                    console.info('MuteStream exec mute audio')
                    data.stream.getAudioTracks()[i].enabled = false
                }
            } else {
                if (data.stream.getAudioTracks()[i].enabled === false) {
                    console.info('MuteStream exec unmute audio')
                    data.stream.getAudioTracks()[i].enabled = true
                }
            }
        }
    }
}

function handleReplaceElement(id){
    let video = document.getElementById(id)
    let audioPreview = document.createElement('audio');
    audioPreview.controls = true;
    audioPreview.autoplay = true;

    video.replaceWith(audioPreview);
    video = audioPreview;
    return video
}

/******************************************getStats**************************************************/
function LoGetStats(){
    if(pc1){
        pc1.getStats(null).then(showLocalStats,
            function(err) {
                console.log(err);
            });
        if ( localVideo.videoWidth) {
            presentHtml.innerHTML = '<strong>Video dimensions:</strong> ' +
                localVideo.videoWidth + 'x' +  localVideo.videoHeight + 'px';
        }
        if (remoteVideo.videoWidth) {
            presentRemoteHtml.innerHTML = '<strong>Video dimensions:</strong> ' +
                remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight + 'px';
        }

    }
    if(pc2){
        pc2.getStats(null)
            .then(showRemoteStats, function(err) {
                console.log(err);
            });
        if ( localVideo.videoWidth) {
            presentHtml.innerHTML = '<strong>Video dimensions:</strong> ' +
                localVideo.videoWidth + 'x' +  localVideo.videoHeight + 'px';
        }
        if (remoteVideo.videoWidth) {
            presentRemoteHtml.innerHTML = '<strong>Video dimensions:</strong> ' +
                remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight + 'px';
        }
    }
}

function ReGetStats(){
    if(pc1){
        pc1.getStats(null)
            .then(showRemoteStats, function(err) {
                console.log(err);
            });
        if ( localVideo.videoWidth) {
            presentHtml.innerHTML = '<strong>Video dimensions:</strong> ' +
                localVideo.videoWidth + 'x' +  localVideo.videoHeight + 'px';
        }
        if (remoteVideo.videoWidth) {
            presentRemoteHtml.innerHTML = '<strong>Video dimensions:</strong> ' +
                remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight + 'px';
        }
    }

    if(pc2){
        pc2.getStats(null)
            .then(showLocalStats, function(err) {
                console.log(err);
            });

        if ( localVideo.videoWidth) {
            presentHtml.innerHTML = '<strong>Video dimensions:</strong> ' +
                localVideo.videoWidth + 'x' +  localVideo.videoHeight + 'px';
        }
        if (remoteVideo.videoWidth) {
            presentRemoteHtml.innerHTML = '<strong>Video dimensions:</strong> ' +
                remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight + 'px';
        }
    }
}
function showLocalStats(results) {
    results.forEach(function(report) {
        if(report.type === 'remote-inbound-rtp'){
           // console.warn("local: remote-inbound-rtp:",report)
        }
        if (report.type === 'outbound-rtp' && (report.mediaType === 'video' ||report.mediaType === 'audio' )) {
            if(report.bytesSent){
                local_bytesSent.innerHTML = '<strong>bytesSent:</strong> ' + report.bytesSent;
            }
        }
    });
}

function showRemoteStats(results) {
    // calculate video bitrate
    results.forEach(function(report) {
        if(report.type === 'remote-inbound-rtp'){
            // console.warn("Remote: remote-inbound-rtp:",report)
        }
        if (report.type === 'inbound-rtp' && (report.mediaType === 'video' ||report.mediaType === 'audio' )) {
            if(report.bytesReceived){
                remote_bytesSent.innerHTML = '<strong>bytesReceived:</strong> ' + report.bytesReceived;
            }
        }
    });
}

function hangup(){
    console.warn("close peerConnection")
    pc1.close();
    pc2.close();
    pc1DataChannel.close()
    pc2DataChannel.close()
    if(pc1.localStream ){
        closeStream(pc1.localStream)
    }

    if(pc2.localStream){
        closeStream(pc2.localStream)
    }

    if(pc1.remoteStream ){
        closeStream(pc1.remoteStream)
    }

    if(pc2.remoteStream){
        closeStream(pc2.remoteStream)
    }

    function closeStream(stream){
        let tracks = stream.getTracks()
        for (let track in tracks) {
            tracks[track].onended = null
            console.info('close stream')
            tracks[track].stop()
        }
    }

}


/********************************************选择设置和初始化处理***************************************************/

window.onload = function(){
    console.log('页面刷新完成触发1111111111');
    setSdp.style.display = "none"
    isReceive.style.display = "none"
    let opus = localStorage.getItem('opus')
    let pcmu = localStorage.getItem('pcmu')
    if(opus === 'true' || pcmu === 'true'){
        selectEncoding.style.display= "none"
        setSdp.style.display = "block"
    }

    mb.className='mb';
    body.appendChild(mb);
}

window.onbeforeunload = function(){    // 处理页面刷新
    console.log('页面刷新之前触发');
    localStorage.setItem('opus', 'false')
    localStorage.setItem('pcmu', 'false')
}


window.onunload = function() {
    console.log('页面刷新完成触发');
}


function selectEncod(data){
    localStorage.setItem(data, 'true')
    selectEncoding.style.display= "none"
    setSdp.style.display = "block"
}

function getTimestamp(date) {
    var yyyy = date.getFullYear();
    var m = date.getMonth() + 1; // getMonth() is zero-based
    var d = date.getDate();
    var h = date.getHours();
    var mi = date.getMinutes();
    var sec = date.getSeconds();
    var msec = date.getMilliseconds();

    var mm  = m < 10 ? "0" + m : m;
    var dd  = d < 10 ? "0" + d : d;
    var hh  = h < 10 ? "0" + h : h;
    var min = mi < 10 ? "0" + mi : mi;
    var ss  = sec < 10 ? "0" + sec : sec;
    var mss = msec < 10 ? "00" + msec : ( msec < 100 ? "0" + msec : msec );

    return "".concat(yyyy).concat("-").concat(mm).concat("-").concat(dd).concat("@").concat(hh).concat(":").concat(min).concat(":").concat(ss).concat(".").concat(mss);
}

function writeToChatLog (message, message_type, isLocal) {
    document.getElementById('chatlog').innerHTML += '<p class="' + message_type + '">' + '[' + getTimestamp(new Date(parseInt((new Date()).getTime()))) + '] ' + message + '</p>'
    if(isLocal){
        document.getElementsByClassName(message_type)[0].style.textAlign = 'right'
    }
    if(isLocal === false){
        document.getElementsByClassName(message_type)[0].style.textAlign = 'left'
    }

    let textMark = document.getElementsByClassName('text-mark')
    for (let i = 0; i < textMark.length; i++) {
        var ul = document.getElementsByClassName('text-mark')[i];
        let handler = function(event){
            console.warn("event:",event)
            var e = event || window.event;
            var target = e.target || e.srcElement;
            console.log(target.innerHTML);
            let dc = getDc()
            dc.send(JSON.stringify({method: 'isReceive', message: true, num: i}))
        };
        if (window.addEventListener){
            ul.addEventListener("click",handler,false);
        }
    }
}

/*******************************************文件处理逻辑************************************************/
let fileBtn = document.getElementById("fileBtn")
let statusMessage = document.querySelector('span#status');
let bitrateDiv = document.querySelector('div#bitrate');
let downloadAnchor = document.querySelector('a#download');

let dataFile = document.getElementsByClassName("dataFile")[0]
let receiveProgress = document.querySelector('progress#receiveProgress');
let sendProgress = document.querySelector('progress#sendProgress');


let receivedSize = 0;
let bytesPrev = 0;
let timestampPrev = 0;
let timestampStart;
let statsInterval = null;
let bitrateMax = 0;
let receiveBuffer = []
let name, type, size, file,unAcceptFileArray = [];
let sendText, receiveText, fileReader;

fileBtn.addEventListener("change",function () {
    // file = this.files[0]
    sendText = this.files[0]
    console.log(`File is ${[sendText.name, sendText.size, sendText.type, sendText.lastModified].join(' ')}`);
    let dc = getDc()
    let data = {name: sendText.name, type: sendText.type, size: sendText.size}
    dc.send(JSON.stringify({method:'notify', message:{text:"对端准备发送内容，请确定是否接收", file: data}}))
})

function sendFile(data){
    statusMessage.textContent = '';
    downloadAnchor.textContent = '';
    if(data.size){
        let fileData = {fileName: data.name, fileType: data.type, fileSize: data.size}
        console.warn("fileData:",fileData)
        let dc = getDc()
        dc.send(JSON.stringify({method: 'type', message:fileData}))
        sendProgress.max = data.size;
        // receiveProgress.max = data.size;
        fileReader = new FileReader();
        let chunkSize = 10 * 1024 ;
        let offset = 0;
        let readSlice = o => {
            const slice = data.slice(offset, o + chunkSize);
            fileReader.readAsArrayBuffer(slice);
        };
        fileReader.addEventListener('error', error => console.error('Error reading file:', error));
        fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
        fileReader.addEventListener('load', e => {
            console.log('FileRead.onload ', e);
            if(e.target.result){
                let dc = getDc()
                dc.send(e.target.result)
                offset += e.target.result.byteLength;
            }
            sendProgress.value = offset;
            if (offset < data.size) {
                readSlice(offset);
            }
        });

        readSlice(0);
    }
}

// function getFileMd5 (file) {
//     statusMessage.textContent = '';
//     downloadAnchor.textContent = '';
//     let fileData = {fileName: file.name, fileType: file.type, fileSize: file.size}
//     console.warn("fileData:",fileData)
//     let dc = getDc()
//     dc.send(JSON.stringify({method: 'type', message:fileData}))
//     sendProgress.max = file.size;
//
//
//     return new Promise((resolve, reject) => {
//         let blobSlice =
//             File.prototype.slice ||
//             File.prototype.mozSlice ||
//             File.prototype.webkitSlice;
//         let chunks = Math.ceil(file.size / 200)
//         let currentChunk = 0;
//         let offset = 0;
//         let spark = new SparkMD5.ArrayBuffer();
//         let fileReader = new FileReader();
//         fileReader.onload = function (e) {
//             if(e.target.result){
//                 let dc = getDc()
//                 dc.send(e.target.result)
//                 offset += e.target.result.byteLength;
//             }
//             sendProgress.value = offset;
//
//             spark.append(e.target.result);
//             currentChunk++;
//             if (currentChunk < chunks) {
//                 loadNext();
//             } else {
//                 let _md5 = spark.end();
//                 resolve(_md5);
//             }
//         };
//         function loadNext() {
//             let start = currentChunk * 200;
//
//             let end = start + 1*1024*1024;  // let end = start + 200;
//             (end > file.size) && (end = file.size);
//             fileReader.readAsArrayBuffer(blobSlice.call(file, start, end)); // 这样才可以正常运行
//         }
//         loadNext();
//     });
// }

function handleGetMessage(dc,e){
    if(e.data.byteLength){
        if(size){
            receiveProgress.max = size;
        }
        handleReceiveMessage(e)
    }else{
        let data = JSON.parse(e.data)
        console.warn("get method:",data.method)
        switch(data.method) {
            case 'notify':
                isReceiveText.innerHTML = data.message.text;
                createOrjoin.style.display = 'block'
                isReceive.style.display = "block"
                if(data.message.file){
                    receiveText = data.message.file
                }
                receiveProgress.value = '';
                break;
            case 'isReceive':
                let getReceive = data.message
                receiveProgress.value = '';
                sendProgress.value = ''
                if (getReceive) {
                    if('num' in data){
                        for(let i in unAcceptFileArray){
                            if(Number(i) === Number(data.num)){
                                sendFile(unAcceptFileArray[i])
                            }
                        }
                    }else{
                        sendFile(sendText)
                    }
                } else {
                    unAcceptFileArray.push(sendText)
                    alert("对端拒绝接受文件")
                }
                break;
            case 'type':
                let getFile = data.message
                console.warn("getFile:", getFile)
                name = getFile.fileName
                type = getFile.fileType
                size = getFile.fileSize
                break;
            case 'message':
                writeToChatLog(JSON.parse(e.data).message, 'text-info', false)
            default:
                console.warn("data:", e.data)
                break;
        }
    }
}


function onReceiveMessageCallback(event) {
    receiveBuffer.push(event.data);
    receivedSize += event.data.byteLength;
    receiveProgress.value = receivedSize;
    // receiveProgress.max = size;

    if (receivedSize === Number(size)) {
        receivedSize = 0
        const received = new Blob(receiveBuffer);
        receiveBuffer = [];

        if(downloadAnchor.href){
            let a = document.createElement('a');
            a.href = URL.createObjectURL(received);
            a.download = name
            a.textContent = `Click to download '${name}' (${size} bytes)`;
            a.style.display = 'block';
            dataFile.appendChild(a);
        }else{
            debugger
            downloadAnchor.href = URL.createObjectURL(received);
            downloadAnchor.download = name
            downloadAnchor.textContent = `Click to download '${name}' (${size} bytes)`;
            downloadAnchor.style.display = 'block';
        }


        // const bitrate = Math.round(receivedSize * 8 /
        //     ((new Date()).getTime() - timestampStart));
        // bitrateDiv.innerHTML =
        //     `<strong>Average Bitrate:</strong> ${bitrate} kbits/sec (max: ${bitrateMax} kbits/sec)`;

        // if (statsInterval) {
        //     clearInterval(statsInterval);
        //     statsInterval = null;
        // }

        // closeDataChannels();
    }
}

function isReceiveRemote(data){
    createOrjoin.style.display = 'none'
    isReceive.style.display = "none"
    let dc = getDc()
    if(Number(data) === 1){
        dc.send(JSON.stringify({method: 'isReceive', message:true}))
    }else{
        let message = `对端尝试有给传输文件'${receiveText.name}' (${receiveText.size} bytes)，但没有接受...,如需要，请点击本字段。`
        writeToChatLog(message, 'text-mark')
        dc.send(JSON.stringify({method: 'isReceive', message:false}))
    }
}



