/* See also:
    http://www.html5rocks.com/en/tutorials/webrtc/basics/
    https://code.google.com/p/webrtc-samples/source/browse/trunk/apprtc/index.html

    https://webrtc-demos.appspot.com/html/pc1.html
*/

var cfg = {'iceServers': [{'url': 'stun:23.21.150.121'}]},
  con = { 'optional': [{'DtlsSrtpKeyAgreement': true}] }

/* THIS IS ALICE, THE CALLER/SENDER */

var pc1 = new RTCPeerConnection(cfg, con),
  dc1 = null, tn1 = null

// Since the same JS file contains code for both sides of the connection,
// activedc tracks which of the two possible datachannel variables we're using.
var activedc
var leveId = document.getElementById("setLevelId").value
var localVideo = document.getElementById('localVideo')
var remoteVideo = document.getElementById('remoteVideo')
var presentHtml = document.getElementById('presentHtml')
var local_bytesSent = document.getElementById('local_bytesSent')

var presentRemoteHtml = document.getElementById('presentRemoteHtml')
var remote_bytesSent = document.getElementById('remote_bytesSent')

var pc1icedone = false

var sdpConstraints = {
  optional: [],
  mandatory: {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: true
  }
}
var constraints = {
    audio: true,
    video: {
        width: {
            ideal: 1920,
            max:  1920,
        },
        height: {
            ideal: 1080,
            max: 1080,
        },
        frameRate: {
            ideal: 15,
            max:  15
        }
    }
};

$('#showLocalOffer').modal('hide')
$('#getRemoteAnswer').modal('hide')
$('#waitForConnection').modal('hide')
$('#createOrJoin').modal('show')

$('#createBtn').click(function () {
  $('#showLocalOffer').modal('show')
  createLocalOffer()
})

$('#joinBtn').click(function () {
  function getSuccess(stream){
    console.log("get stream success constraints: " + JSON.stringify(constraints, null, '  '))
    var video = document.getElementById('localVideo')
    video.srcObject = stream
    video.play()
    pc2.addStream(stream)
   setInterval(function() {ReGetStats()},1000)
  }

  function getFailed(error){
      console.log('Error adding stream to pc2: ' + error)
  }
  if(navigator.getDisplayMedia){
    console.warn("1111")
    navigator.getDisplayMedia(constraints).then(getSuccess).catch(getFailed)
  }else if(navigator.mediaDevices.getDisplayMedia){
    console.warn("22222")
    navigator.mediaDevices.getDisplayMedia(constraints).then(getSuccess).catch(getFailed)
  }else{
      var screen_constraints = {
          audio: false,
          video: {
              mozMediaSource: 'screen',
              mediaSource: 'screen',
              width: {min: '10',max: '1920'},
              height: {min: '10',max: '1080'},
              frameRate: {min: '1', max: '5'}
          }
      };
     navigator.mediaDevices.getUserMedia(screen_constraints).then(getSuccess).catch(getFailed)
     console.warn("该浏览器不支持getDisplayMedia接口");
  }
  $('#getRemoteOffer').modal('show')
})

$('#offerSentBtn').click(function () {
  $('#getRemoteAnswer').modal('show')
})

$('#offerRecdBtn').click(function () {
  var offer = $('#remoteOffer').val()
  var offerDesc = new RTCSessionDescription(JSON.parse(offer))
  console.log('Received remote offer', offerDesc.sdp.toString())
  offerDesc = dealWithSdp(offerDesc,leveId)
  console.log(" get remote offer:",offerDesc.sdp.toString())
  setInterval(function() { ReGetStats()},1000)
  writeToChatLog('Received remote offer', 'text-success')
  handleOfferFromPC1(offerDesc)
  $('#showLocalAnswer').modal('show')
})

$('#answerSentBtn').click(function () {
  $('#waitForConnection').modal('show')
})

$('#answerRecdBtn').click(function () {
  var answer = $('#remoteAnswer').val()
  var answerDesc = new RTCSessionDescription(JSON.parse(answer))
  handleAnswerFromPC2(answerDesc)
  $('#waitForConnection').modal('show')
})

$('#fileBtn').change(function () {
  var file = this.files[0]
  console.log(file)

  sendFile(file)
})

function fileSent (file) {
  console.log(file + ' sent')
}

function fileProgress (file) {
  console.log(file + ' progress')
}

function sendFile (data) {
  if (data.size) {
    FileSender.send({
      file: data,
      onFileSent: fileSent,
      onFileProgress: fileProgress,
    })
  }
}

function sendMessage () {
  if ($('#messageTextBox').val()) {
    var channel = new RTCMultiSession()
    writeToChatLog($('#messageTextBox').val(), 'text-success')
    channel.send({message: $('#messageTextBox').val()})
    $('#messageTextBox').val('')

    // Scroll chat text area to the bottom on new input.
    $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight)
  }

  return false
}

function setupDC1 () {
  try {
    var fileReceiver1 = new FileReceiver()
    dc1 = pc1.createDataChannel('test', {reliable: true})
    activedc = dc1
    console.log('Created datachannel (pc1)')
    dc1.onopen = function (e) {
      console.log('data channel connect')
      $('#waitForConnection').modal('hide')
      $('#waitForConnection').remove()
    }
    dc1.onmessage = function (e) {
      console.log('Got message (pc1)', e.data)
      if (e.data.size) {
        fileReceiver1.receive(e.data, {})
      } else {
        if (e.data.charCodeAt(0) == 2) {
          // The first message we get from Firefox (but not Chrome)
          // is literal ASCII 2 and I don't understand why -- if we
          // leave it in, JSON.parse() will barf.
          return
        }
        console.log(e)
        var data = JSON.parse(e.data)
        if (data.type === 'file') {
          fileReceiver1.receive(e.data, {})
        } else {
          writeToChatLog(data.message, 'text-info')
          // Scroll chat text area to the bottom on new input.
          $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight)
        }
      }
    }
  } catch (e) { console.warn('No data channel (pc1)', e); }
}

function createLocalOffer () {
    console.log('video1')
    function getSuccess(stream) {
        console.log("get stream success constraints: " + JSON.stringify(constraints, null, '  '))
        var video = document.getElementById('localVideo')
        video.srcObject = stream
        video.play()
        pc1.addStream(stream)
        console.log("video:",stream)
        console.log('adding stream to pc1')
        setupDC1()
        pc1.createOffer(function (desc) {
            pc1.setLocalDescription(desc, function () {
            }, function () {
            })
            console.log('created local offer', desc.sdp.toString())
            desc = dealWithSdp(desc,leveId)
            console.log('local offer:',desc.sdp.toString())
        }, function () {
            console.warn("Couldn't create offer")
        }, sdpConstraints)

        setInterval(function() { LoGetStats()},1000)
    }

    function getFailed(error){
        console.log('Error adding stream to pc1: ' + error)
    }

    if(navigator.getDisplayMedia){
        navigator.getDisplayMedia(constraints).then(getSuccess).catch(getFailed)
    }else if(navigator.mediaDevices.getDisplayMedia){
        navigator.mediaDevices.getDisplayMedia(constraints).then(getSuccess).catch(getFailed)
    }
    setInterval(function() { LoGetStats()},1000)

}

function LoGetStats(){
    if(pc1 || pc2){
        pc1.getStats(null)
            .then(showLocalStats, function(err) {
                console.log(err);
            });
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
    if(pc1 || pc2){
        pc2.getStats(null)
            .then(showLocalStats, function(err) {
                console.log(err);
            });
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
}
function showLocalStats(results) {
    console.warn("result:",results)
    results.forEach(function(report) {
        if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
            console.warn("timestamp:",report.timestamp)
            console.warn("bysentSent111:",report.bytesSent)
            if(report.bytesSent){
                local_bytesSent.innerHTML = '<strong>bytesSent:</strong> ' + report.bytesSent;
            }
        }
    });
}

function showRemoteStats(results) {
    // calculate video bitrate
    results.forEach(function(report) {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
            console.warn("results come in 2")
            console.warn("bytesReceived:",report.bytesReceived)
            if(report.bytesReceived){
                console.warn("bysentSent2222:",report.bytesReceived)
                remote_bytesSent.innerHTML = '<strong>bytesReceived:</strong> ' + report.bytesReceived;
            }
        }
    });
}



pc1.onicecandidate = function (e) {
  console.log('ICE candidate (pc1)', e)
  if (e.candidate == null) {
    $('#localOffer').html(JSON.stringify(pc1.localDescription))
  }
}

function handleOnaddstream (e) {
  console.warn("handOnaddsteam:",e)
  console.log('Got remote stream', e.stream)
  var el = document.getElementById('remote_localVideo')
  el.autoplay = true
  // attachMediaStream(el, e.stream)
  el.srcObject = e.stream

}

function handleOnaddremotestream(event){
  console.warn("handleOnaddlocalstream:",event)
  console.log('Got remote stream', event.stream)
  var remotevideo = document.getElementById('remoteVideo')
  remotevideo.autoplay = true
  remotevideo.srcObject = event.stream
}

pc1.onaddstream = handleOnaddstream
pc1.onaddstream = handleOnaddremotestream

function handleOnconnection () {
  console.log('Datachannel connected')
  writeToChatLog('Datachannel connected', 'text-success')
  $('#waitForConnection').modal('hide')
  // If we didn't call remove() here, there would be a race on pc2:
  //   - first onconnection() hides the dialog, then someone clicks
  //     on answerSentBtn which shows it, and it stays shown forever.
  $('#waitForConnection').remove()
  $('#showLocalAnswer').modal('hide')
  $('#messageTextBox').focus()
}

pc1.onconnection = handleOnconnection

function onsignalingstatechange (state) {
  console.info('signaling state change:', state)
}

function oniceconnectionstatechange (state) {
  console.info('ice connection state change:', state)
}

function onicegatheringstatechange (state) {
  console.info('ice gathering state change:', state)
}

pc1.onsignalingstatechange = onsignalingstatechange
pc1.oniceconnectionstatechange = oniceconnectionstatechange
pc1.onicegatheringstatechange = onicegatheringstatechange

function handleAnswerFromPC2 (answerDesc) {
  console.log('Received remote answer: ', answerDesc)
  answerDesc = dealWithSdp(answerDesc,leveId)
  console.log('remote answer:',answerDesc.sdp.toString())
  setInterval(function() { ReGetStats()},1000)
  writeToChatLog('Received remote answer', 'text-success')
  pc1.setRemoteDescription(answerDesc)
}

function dealWithSdp(desc,leveId){
    console.log("处理SDP")
    let parsedSdp = SDPTools.parseSDP(desc.sdp)
    console.warn("sdp:",parsedSdp)
    for(let i = 0; i < parsedSdp.media.length; i++){
        if(parsedSdp.media[i].type == 'video'){
            let media = parsedSdp.media[i]
            let codec = ['VP9','VP8']
            console.warn("删除VP8、VP9编码")
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


function getExternalEncoder(media){
    console.warn("come in getExternalEncoder:",media)
    let codec
    // let rtcpFb
    console.warn("type:",media.type)
    if(media.type == 'video'){
        if(media && media.fmtp && media.fmtp.length){
            for(let i = 0; i< media.fmtp.length; i++){
                let config = media.fmtp[i].config
                if(config.indexOf('packetization-mode=1') >= 0 && config.indexOf('profile-level-id=42e0') >= 0) {
                    codec = media.fmtp[i].payload
                    break;
                }
            }
            if(!codec){
                for(let i = 0; i<media.fmtp.length; i++){
                    let config = media.fmtp[i].config
                    if(config.indexOf('packetization-mode=1') >= 0 && config.indexOf('profile-level-id=4200') >= 0) {
                        codec = media.fmtp[i].payload
                        break;
                    }
                }
            }
            console.warn('get priority H264 PT ' + codec)
        }
    }
    return codec
}

function handleCandidateFromPC2 (iceCandidate) {
  pc1.addIceCandidate(iceCandidate)
}

/* THIS IS BOB, THE ANSWERER/RECEIVER */

var pc2 = new RTCPeerConnection(cfg, con),
  dc2 = null

var pc2icedone = false

pc2.ondatachannel = function (e) {
  var fileReceiver2 = new FileReceiver()
  var datachannel = e.channel || e; // Chrome sends event, FF sends raw channel
  console.log('Received datachannel (pc2)', arguments)
  dc2 = datachannel
  activedc = dc2
  dc2.onopen = function (e) {
    console.log('data channel connect')
    $('#waitForConnection').modal('hide')
    $('#waitForConnection').remove()
  }
  dc2.onmessage = function (e) {
    console.log('Got message (pc2)', e.data)
    if (e.data.size) {
      fileReceiver2.receive(e.data, {})
    } else {
      var data = JSON.parse(e.data)
      if (data.type === 'file') {
        fileReceiver2.receive(e.data, {})
      } else {
        writeToChatLog(data.message, 'text-info')
        // Scroll chat text area to the bottom on new input.
        $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight)
      }
    }
  }
}

function handleOfferFromPC1 (offerDesc) {
  pc2.setRemoteDescription(offerDesc)
  pc2.createAnswer(function (answerDesc) {
    writeToChatLog('Created local answer', 'text-success')
    console.log('Created local answer: ', answerDesc.sdp.toString())
    answerDesc = dealWithSdp(answerDesc,leveId)
    console.log("local answer:",answerDesc.sdp.toString())
    pc2.setLocalDescription(answerDesc)
    setInterval(function() { LoGetStats()},1000)
  },
  function () { console.warn("Couldn't create offer") },
  sdpConstraints)

  setInterval(function() { ReGetStats()},1000)

}

pc2.onicecandidate = function (e) {
  console.log('ICE candidate (pc2)', e)
  if (e.candidate == null) {
    $('#localAnswer').html(JSON.stringify(pc2.localDescription))
  }
}

pc2.onsignalingstatechange = onsignalingstatechange
pc2.oniceconnectionstatechange = oniceconnectionstatechange
pc2.onicegatheringstatechange = onicegatheringstatechange

function handleCandidateFromPC1 (iceCandidate) {
  pc2.addIceCandidate(iceCandidate)
}

pc2.onaddstream = handleOnaddstream
pc2.onaddstream = handleOnaddremotestream
pc2.onconnection = handleOnconnection

function getTimestamp () {
  var totalSec = new Date().getTime() / 1000
  var hours = parseInt(totalSec / 3600) % 24
  var minutes = parseInt(totalSec / 60) % 60
  var seconds = parseInt(totalSec % 60)

  var result = (hours < 10 ? '0' + hours : hours) + ':' +
    (minutes < 10 ? '0' + minutes : minutes) + ':' +
    (seconds < 10 ? '0' + seconds : seconds)

  return result
}

function writeToChatLog (message, message_type) {
  document.getElementById('chatlog').innerHTML += '<p class="' + message_type + '">' + '[' + getTimestamp() + '] ' + message + '</p>'
}
