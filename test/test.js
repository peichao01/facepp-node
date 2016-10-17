var fs     = require('fs')
var FacePP = require('../index')

var face = new FacePP('c54dc270b58f5d201a02841d27a0e299', 'Y11W8OetIbXaoJInXM4o8G2yUf5mSdm7')

// face.request('detection/detect', {
//     url: 'http://ww3.sinaimg.cn/mw690/47009408jw1f8v3a77h2kj21610vkk2p.jpg',
// }, function (err, result) {
//     if (err) {
//         return ''
//     }
//     console.log(result)
// })

face.request('detection/detect', {
    // img: fs.readFileSync('/Users/peichao/Downloads/00.jpg'),
    //img: fs.createReadStream('/Users/peichao/Downloads/00.jpg'),
    img: '/Users/peichao/Downloads/00.jpg',
}, function (err, result) {
    console.log(err, result)
})