import queue from 'queue';

export const queueSelector = queue({
  autostart: true,
  results: []
})

queueSelector.start(function (err) {
  if (err) {
    console.log(err);
  }
  console.log('all done:', queueSelector.results)
})
