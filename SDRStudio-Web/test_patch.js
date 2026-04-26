const axios = require('axios');
async function test() {
  const current = await axios.get('http://127.0.0.1:8091/sdrangel/deviceset/0/channel/0/settings');
  const data = current.data;
  data.DATVModSettings.tsFilePlay = 1;
  data.DATVModSettings.tsSource = 1;
  data.DATVModSettings.tsFilePlayLoop = 1;
  await axios.patch('http://127.0.0.1:8091/sdrangel/deviceset/0/channel/0/settings', data);
  console.log("Patched");
}
test();
