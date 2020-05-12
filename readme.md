## xtion-label
  a js label marker for machine learning like label me

### online demo
[https://wangzhipeng404.github.io/xtion-label/](http://https://wangzhipeng404.github.io/xtion-label/ "https://wangzhipeng404.github.io/xtion-label/")

### Getting Start
in browser
```
<srcipt src="path2xtion-label/lib/index.umd.js"></script>
```
or use npm
```
npm install xtion-label
```
then import it
```
import XLabel from 'xtion-label'

const config = { /* see options */}
const xlabel = new XLabel(document.getElementById('container'), config)
xlabel.setImg('/label-img-path')
xlabel.setData(label data)


// get label data
xlabel.getData()
```

### Options

|option| defaultValue| desc|
| ------ | ------ | ------ |
|zoomMax| 10| max zoom level|
|zoomMin| 0.5| min zoom level|

### Shutcouts
|shortut|Description|
| ------ | ------ |
|ctrl + r| draw reactangle|
|ctrl + c| draw circle|
|ctrl + p| draw polyon|
|ctrl + wheel| zoom change|
|ctrl + leftClick| copy shape or move img|

