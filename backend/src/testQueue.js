require('./queue');

setTimeout(() => {
  console.log('Test done');
  process.exit(0);
}, 2000);