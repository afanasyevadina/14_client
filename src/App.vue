<template>
  <div class="main">
    <div class="editor" v-if="initialized">
      <div class="panel">
        <div>
          <small>Tool</small>
          <div class="btn-tools">
            <button v-for="tool in ['brush', 'rectangle', 'ellipse', 'polygon', 'stamp', 'star', 'fill']" :key="tool" @click="options.activeTool = tool" :class="{active: this.options.activeTool === tool}">
              {{ tool.slice(0, 1).toUpperCase() }}{{ tool.slice(1) }}
            </button>
          </div>
        </div>
        <div>
          <small>Actions</small>
          <div class="btn-tools">
            <button @click="saveJpeg">Save to jpeg</button>
            <button @click="saveSdp">Save to sdp</button>
            <label for="upload-sdp" class="button">Upload sdp</label>
            <input type="file" id="upload-sdp" style="display: none" @change="uploadSdp">
            <button @click="jumpToSnapshot(state.currentSnapshot - 1)" :disabled="!state.currentSnapshot || state.currentSnapshot < snapshots.length - 3">Undo</button>
            <button @click="jumpToSnapshot(state.currentSnapshot + 1)" :disabled="state.currentSnapshot === snapshots.length - 1">Redo</button>
          </div>
        </div>
      </div>
      <div>
        <div class="options mb">
          <div class="mb">
            <small>Stroke color</small>
            <div class="btn-colors">
              <button v-for="(color, c) in ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#800080']" :key="c" :style="{background: color}" @click="options.strokeColor = color; rememberColor(color)" :class="{active: this.options.strokeColor === color}"></button>
            </div>
            <input type="color" v-model="options.strokeColor" @change="rememberColor($event.target.value)">
          </div>
          <div class="mb">
            <small>Fill color</small>
            <div class="btn-colors">
              <button v-for="(color, c) in ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#800080']" :key="c" :style="{background: color}" @click="options.fillColor = color; rememberColor(color)" :class="{active: this.options.fillColor === color}"></button>
            </div>
            <input type="color" v-model="options.fillColor" @change="rememberColor($event.target.value)">
          </div>
          <div class="mb" v-if="lastUsedColors.length">
            <small>Last used colors</small>
            <div class="btn-colors">
              <button v-for="(color, c) in lastUsedColors" :key="c" :style="{background: color}" @click="options.strokeColor = color"></button>
            </div>
          </div>
          <div class="mb" v-if="['brush', 'rectangle', 'ellipse', 'polygon', 'star', 'stamp'].includes(options.activeTool)">
            <small>Line width</small>
            <select v-model="options.lineWidth">
              <option value="1">1 px</option>
              <option value="2">2 px</option>
              <option value="3">3 px</option>
              <option value="4">4 px</option>
              <option value="5">5 px</option>
              <option value="6">6 px</option>
              <option value="7">7 px</option>
              <option value="8">8 px</option>
              <option value="9">9 px</option>
              <option value="10">10 px</option>
            </select>
          </div>
          <div class="mt mb" v-if="['rectangle', 'ellipse', 'polygon', 'star'].includes(options.activeTool)">
            <label>
              <input type="checkbox" v-model="options.fillShape"> Fill shapes
            </label>
          </div>
          <div class="mt mb" v-if="['polygon', 'star'].includes(options.activeTool)">
            <small>{{ options.activeTool === 'star' ? 'Spikes' : 'Sides' }} count</small>
            <input type="number" v-model="options.sidesCount" min="3">
          </div>
          <template v-if="options.activeTool === 'star'">
            <div class="mt mb">
              <small>Outer radius</small>
              <input type="number" v-model="options.outerRadius">
            </div>
            <div class="mt mb">
              <small>Inner radius</small>
              <input type="number" v-model="options.innerRadius">
            </div>
          </template>
          <div class="mt" v-if="options.activeTool === 'stamp'">
            <div class="btn-images">
              <button v-for="stamp in stamps" :key="stamp.src" @click="options.activeStamp = stamp.src" :class="{active: options.activeStamp === stamp.src}">
                <img :src="stamp.src" alt="">
              </button>
            </div>
            <label for="custom-pattern">Custom pattern</label>
            <input id="custom-pattern" type="file" accept="image/*" @change="addImage">
          </div>
        </div>
        <div class="layers">
          <div class="mb">
            <button @click="addLayer(); makeSnapshot()">Add layer</button>
          </div>
          <div class="layers-list">
            <div class="layer mb" v-for="(layer, l) in layers" :key="layer.id"
                 :class="{active: activeLayer.id === layer.id}">
              <a href="#" class="unset" @click.prevent="activeLayer = layer">
                {{ layer.name }}<br>
                <i>({{ layer.vector ? 'Vector' : 'Bitmap' }})</i>
              </a>
              <div v-if="layers.length > 1 && !layer.background">
                <template v-if="l > 1">
                  <a href="#" @click.prevent="layers.splice(l - 1, 2, layers[l], layers[l - 1])">Down</a>
                  <br>
                </template>
                <template v-if="layers.length > l + 1">
                  <a href="#" @click.prevent="layers.splice(l, 2, layers[l + 1], layers[l])">Up</a>
                  <br>
                </template>
                <a href="#" @click.prevent="deleteLayer(l)">Delete</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="area">
          <div class="layer-canvas" v-for="layer in layers" :key="layer.id" :style="{top: `${layer.top}px`, left: `${layer.left}px`}">
            <canvas :id="`canvas-${layer.id}`" :width="layer.width" :height="layer.height" :class="{active: !layer.background && layer.id === activeLayer.id}"></canvas>
            <template v-if="layer.id === activeLayer.id && !layer.background">
              <div class="vertice" :class="vertice" v-for="vertice in ['top-left', 'top-right', 'bottom-left', 'bottom-right']" :key="vertice" @mousedown="state.resizing = vertice" @mousemove="mousemove"></div>
            </template>
          </div>
          <canvas id="work-canvas" :width="options.canvasWidth" :height="options.canvasHeight" @mousedown="mousedown"
                  @mousemove="mousemove" :style="{cursor: cursor}"></canvas>
          <div class="vertice bottom-right" v-if="activeLayer.background || (activeLayer.width < options.canvasWidth || activeLayer.height < options.canvasHeight)" @mousedown="state.resizing = 'canvas'" @mousemove="mousemove"></div>
        </div>
      </div>
    </div>
    <div class="welcome" v-else>
      <form action="#" @submit.prevent="init">
        <p class="mb">
          <label>Canvas width</label>
          <input type="number" v-model="options.canvasWidth" class="block">
        </p>
        <p class="mb">
          <label>Canvas height</label>
          <input type="number" v-model="options.canvasHeight" class="block">
        </p>
        <p class="mb">
          <label>Canvas background</label>
          <input type="color" v-model="options.fillColor" class="block">
        </p>
        <button class="block">Create</button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      layers: [],
      activeLayer: {shapes: []},
      options: {
        activeTool: 'brush',
        activeStamp: 'img/logo.png',
        lineWidth: 1,
        strokeColor: '#000000',
        fillColor: '#FFFFFF',
        fillShape: true,
        sidesCount: 6,
        canvasWidth: 800,
        canvasHeight: 600,
        outerRadius: 100,
        innerRadius: 30
      },
      state: {
        selectionStart: {x: 0, y: 0},
        drawing: false,
        moving: false,
        resizing: null,
        currentSnapshot: -1,
      },
      lastUsedColors: [],
      initialized: false,
      snapshots: [],
      stamps: [{src: 'img/logo.png'}, {src: 'img/shape-1.jpg'}, {src: 'img/shape-2.jpg'}, {src: 'img/shape-3.jpg'}, {src: 'img/shape-4.jpg'}]
    }
  },
  watch: {
    options: {
      deep: true,
      handler: function () {
        if (this.options.innerRadius > this.options.outerRadius) this.options.innerRadius = this.options.outerRadius
      }
    }
  },
  computed: {
    cursor: function () {
      if (this.options.activeTool === 'stamp') return `url(${this.options.activeStamp}), crosshair`
      if (this.state.moving) return 'grab'
      if (this.state.drawing) return 'crosshair'
      return 'default'
    }
  },
  methods: {
    addLayer: function (vector = false) {
      this.layers.push({
        id: Date.now(),
        name: `Layer ${this.layers.length + 1}`,
        visible: true,
        width: this.options.canvasWidth,
        height: this.options.canvasHeight,
        top: 0,
        left: 0,
        shapes: [],
        vector: vector
      })
      this.activeLayer = this.layers[this.layers.length - 1]
      this.$nextTick(() => {
        this.initializeCanvas(this.activeLayer)
      })
    },
    initializeCanvas: function (layer) {
      layer.el = document.getElementById(`canvas-${layer.id}`)
      layer.ctx = layer.el.getContext('2d')
      this.$nextTick(() => this.drawShapes(layer))
    },
    init: function () {
      this.initialized = true
      this.addLayer()
      this.$nextTick(() => {
        this.activeLayer.background = this.options.fillColor
        this.activeLayer.name += ' - Background'
        this.drawShapes(this.activeLayer)
        this.rememberColor(this.options.fillColor)
        this.makeSnapshot()
      })
    },
    makeSnapshot: function () {
      this.snapshots = this.snapshots.slice(0, this.state.currentSnapshot + 1)
      this.snapshots.push({
        canvas: {
          width: this.options.canvasWidth,
          height: this.options.canvasHeight
        },
        layers: [...this.layers].map(v => ({
          background: v.background,
          id: v.id,
          height: v.height,
          width: v.width,
          top: v.top,
          left: v.left,
          name: v.name,
          visible: v.visible,
          shapes: [...v.shapes]
        })),
        timestamp: Date.now()
      })
      this.state.currentSnapshot++
    },
    getRealPosition: function (event) {
      let boundingClientRect = document.getElementById('work-canvas').getBoundingClientRect()
      return {
        x: Math.min(event.x - boundingClientRect.x, this.options.canvasWidth),
        y: Math.min(event.y - boundingClientRect.y, this.options.canvasHeight)
      }
    },
    rememberColor: function (color) {
      this.lastUsedColors.unshift(color)
      this.lastUsedColors = this.lastUsedColors.filter((item, index, array) => array.indexOf(item) === index).slice(0, 10)
    },
    deleteLayer: function (index) {
      this.layers.splice(index, 1)
      if (!this.layers.find(layer => layer.id === this.activeLayer.id))
        this.activeLayer = this.layers[index + 1] || this.layers[index - 1]
      this.makeSnapshot()
    },
    mousedown: async function (event) {
      let {x, y} = this.getRealPosition(event)
      this.state.selectionStart = {x, y}
      if (event.ctrlKey) {
        this.state.moving = true
        return
      }
      this.state.drawing = true
      let shape = {tool: this.options.activeTool}
      switch (this.options.activeTool) {
        case "brush":
          x -= this.activeLayer.left
          y -= this.activeLayer.top
          shape.dots = [{
            x : this.activeLayer.width ? x / this.activeLayer.width : 0,
            y: this.activeLayer.height ? y / this.activeLayer.height : 0
          }]
          break
        case "ellipse":
        case "rectangle":
        case "polygon":
        case "star":
          this.addLayer(true)
          await this.$nextTick()
          this.activeLayer.name += ` - ${this.options.activeTool}`
          this.activeLayer.left = x
          this.activeLayer.top = y
          this.activeLayer.width = 0
          this.activeLayer.height = 0
          break
        case "stamp":
          shape.stamp = this.options.activeStamp
          x -= this.activeLayer.left
          y -= this.activeLayer.top
          shape.dots = [{
            x : this.activeLayer.width ? x / this.activeLayer.width : 0,
            y: this.activeLayer.height ? y / this.activeLayer.height : 0
          }]
          break
        case "fill":
          shape.x = this.activeLayer.width ? x / this.activeLayer.width : 0
          shape.y = this.activeLayer.height ? y / this.activeLayer.height : 0
          break
        default:
          break
      }
      shape.lineWidth = this.options.lineWidth
      shape.strokeStyle = this.options.strokeColor
      shape.fillStyle = this.options.fillColor
      shape.fillShape = this.options.fillShape
      shape.sidesCount = this.options.sidesCount
      shape.radiusRatio = this.options.outerRadius ? this.options.innerRadius / this.options.outerRadius : 0
      this.activeLayer.ctx.lineWidth = this.options.lineWidth
      this.activeLayer.ctx.strokeStyle = this.options.strokeColor
      this.activeLayer.ctx.fillStyle = this.options.fillColor
      this.activeLayer.shapes.push(shape)
      await this.drawShapes(this.activeLayer)
    },
    mousemove: function (event) {
      let {x, y} = this.getRealPosition(event)
      let sx = this.state.selectionStart.x
      let sy = this.state.selectionStart.y
      if (this.state.drawing) {
        let shape = this.activeLayer.shapes[this.activeLayer.shapes.length - 1]
        switch (this.options.activeTool) {
          case "brush":
            x -= this.activeLayer.left
            y -= this.activeLayer.top
            if (event.shiftKey) {
              if (Math.abs(sx - x) < Math.abs(sy - y)) x = sx
              else y = sy
            } else {
              this.state.selectionStart = {x, y}
            }
            shape.dots.push({
              x : this.activeLayer.width ? x / this.activeLayer.width : 0,
              y: this.activeLayer.height ? y / this.activeLayer.height : 0
            })
            break
          case "rectangle":
          case "ellipse":
          case "polygon":
          case "star":
            this.activeLayer.width = Math.abs(x - sx)
            this.activeLayer.height = event.shiftKey ? this.activeLayer.width : Math.abs(y - sy)
            this.activeLayer.top = Math.min(sy, y)
            this.activeLayer.left = Math.min(sx, x)
            break
          case "stamp":
            x -= this.activeLayer.left
            y -= this.activeLayer.top
            shape.dots.push({
              x : this.activeLayer.width ? x / this.activeLayer.width : 0,
              y: this.activeLayer.height ? y / this.activeLayer.height : 0
            })
            break
          default:
            break
        }
        this.drawShapes(this.activeLayer)
      }
      if (this.state.resizing) {
        if (this.state.resizing === 'canvas') this.scaleCanvas(event)
        else this.scaleLayer(event)
      }
      if (this.state.moving) {
        this.activeLayer.top += y - sy
        this.activeLayer.left += x - sx
        this.state.selectionStart = {x, y}
      }
    },
    mouseup: function () {
      let isAction = this.state.drawing || this.state.resizing || this.state.moving
      this.state.drawing = false
      this.state.moving = false
      this.state.resizing = null
      if (isAction) this.$nextTick(() => this.makeSnapshot())
    },
    scaleLayer: function (event) {
      let x1 = this.activeLayer.left
      let x2 = this.activeLayer.left + this.activeLayer.width
      let y1 = this.activeLayer.top
      let y2 = this.activeLayer.top + this.activeLayer.height
      let {x, y} = this.getRealPosition(event)
      let ratio = this.activeLayer.height ? this.activeLayer.width / this.activeLayer.height : 0
      switch (this.state.resizing) {
        case "top-left":
          x1 = Math.min(x2, x)
          y1 = Math.min(y2, y)
          break
        case "top-right":
          x2 = Math.max(x1, x)
          y1 = Math.min(y2, y)
          break
        case "bottom-left":
          x1 = Math.min(x2, x)
          y2 = Math.max(y1, y)
          break
        case "bottom-right":
          x2 = Math.max(x1, x)
          y2 = Math.max(y1, y)
          break
        default:
          break
      }
      this.activeLayer.width = x2 - x1
      this.activeLayer.height = event.shiftKey ? (ratio ? this.activeLayer.width / ratio : 0) : y2 - y1
      this.activeLayer.top = this.state.resizing === 'top-left' || this.state.resizing === 'top-right' ? y2 - this.activeLayer.height : y1
      this.activeLayer.left = this.state.resizing === 'top-left' || this.state.resizing === 'top-right' ? x2 - this.activeLayer.width : x1
      this.$nextTick(() => this.drawShapes(this.activeLayer))
    },
    scaleCanvas: function (event) {
      let {x, y} = this.getRealPosition(event)
      let previousWidth = this.options.canvasWidth
      let previousHeight = this.options.canvasHeight
      let ratio = this.options.canvasHeight ? this.options.canvasWidth / this.options.canvasHeight : 0
      this.options.canvasWidth = x
      this.options.canvasHeight = event.shiftKey ? (ratio ? this.options.canvasWidth / ratio : 0) : y
      this.layers.forEach(layer => {
        layer.top = layer.top / Math.max(previousHeight, 1) * this.options.canvasHeight
        layer.left = layer.left / Math.max(previousWidth, 1) * this.options.canvasWidth
        layer.height = layer.height / Math.max(previousHeight, 1) * this.options.canvasHeight
        layer.width = layer.width / Math.max(previousWidth, 1) * this.options.canvasWidth
        this.$nextTick(() => this.drawShapes(layer))
      })
    },
    drawShapes: function (layer) {
      if (layer.background) {
        layer.ctx.fillStyle = layer.background
        layer.ctx.fillRect(0, 0, layer.width, layer.height)
      }
      layer.shapes.forEach(shape => {
        this.$nextTick(() => {
          layer.ctx.lineWidth = shape.lineWidth
          layer.ctx.strokeStyle = shape.strokeStyle
          layer.ctx.fillStyle = shape.fillStyle
          if (shape.tool === 'brush') {
            if (shape.dots[0]) {
              layer.ctx.moveTo(shape.dots[0].x * layer.width, shape.dots[0].y * layer.height)
              layer.ctx.beginPath()
            }
            shape.dots.slice(1).forEach(dot => {
              layer.ctx.lineTo(dot.x * layer.width, dot.y * layer.height)
              layer.ctx.stroke()
            })
          } else if (shape.tool === 'rectangle') {
            layer.ctx.clearRect(0, 0, layer.width, layer.height)
            layer.ctx.rect(Math.floor(shape.lineWidth / 2), Math.floor(shape.lineWidth / 2), layer.width - shape.lineWidth, layer.height - shape.lineWidth)
            if (shape.fillShape) layer.ctx.fill()
            layer.ctx.stroke()
          } else if (shape.tool === 'ellipse') {
            layer.ctx.clearRect(0, 0, layer.width, layer.height)
            layer.ctx.beginPath()
            layer.ctx.ellipse(layer.width / 2, layer.height / 2, Math.abs(layer.width / 2 - shape.lineWidth / 2), Math.abs(layer.height / 2 - shape.lineWidth / 2), 0, 0, Math.PI * 2)
            if (shape.fillShape) layer.ctx.fill()
            layer.ctx.stroke()
          } else if (shape.tool === 'polygon') {
            layer.ctx.clearRect(0, 0, layer.width, layer.height)
            if (shape.sidesCount > 2) {
              layer.ctx.beginPath()
              let a = ((Math.PI * 2)/shape.sidesCount)
              let radiusY = layer.height / 2
              let radiusX = layer.width / 2
              layer.ctx.translate(radiusX, radiusY);
              layer.ctx.moveTo(radiusX,0);
              for (let i = 1; i < shape.sidesCount; i++) {
                layer.ctx.lineTo(radiusX*Math.cos(a*i),radiusY*Math.sin(a*i));
              }
              layer.ctx.closePath();
              if (shape.fillShape) layer.ctx.fill()
              layer.ctx.stroke()
            }
          } else if (shape.tool === 'star') {
            layer.ctx.clearRect(0, 0, layer.width, layer.height)
            if (shape.sidesCount > 2) {
              let stepsCount = shape.sidesCount * 2
              layer.ctx.beginPath()
              let a = ((Math.PI * 2)/stepsCount)
              let radiusY = layer.height / 2
              let radiusX = layer.width / 2
              layer.ctx.translate(radiusX, radiusY);
              layer.ctx.moveTo(radiusX,0);
              for (let i = 1; i < stepsCount; i++) {
                layer.ctx.lineTo((i % 2 ? radiusX * shape.radiusRatio : radiusX)*Math.cos(a*i),(i % 2 ? radiusY * shape.radiusRatio : radiusY)*Math.sin(a*i));
              }
              layer.ctx.closePath();
              if (shape.fillShape) layer.ctx.fill()
              layer.ctx.stroke()
            }
          } else if (shape.tool === 'stamp') {
            let stamp = this.stamps.find(v => v.src === shape.stamp)
            if (stamp.image) {
              this.renderImage(layer, stamp.image, shape.dots, shape.lineWidth)
            }
            let image = new Image()
            image.onload = () => {
              this.renderImage(layer, image, shape.dots, shape.lineWidth)
              stamp.image = image
            }
            image.src = shape.stamp
          }
        })
      })
    },
    renderImage: function (layer, image, dots, weight) {
      dots.forEach(dot => {
        layer.ctx.drawImage(image, 0, 0, image.width, image.height, layer.width * dot.x, layer.height * dot.y, 20 * weight, 20 * weight)
      })
    },
    leadZero: function (n) {
      return n < 10 ? `0${n}` : n
    },
    saveJpeg: function () {
      let canvas = document.createElement('canvas')
      canvas.width = this.options.canvasWidth
      canvas.height = this.options.canvasHeight
      let context = canvas.getContext('2d')
      this.layers.forEach(layer => {
        if (layer.width && layer.height)
          context.drawImage(layer.el, 0, 0, layer.width, layer.height, layer.left, layer.top, layer.width, layer.height)
      })
      let data = canvas.toDataURL('image/jpeg')
      let a = document.createElement('a')
      a.href = data
      a.download = `${new Date().getFullYear()}${this.leadZero(new Date().getMonth())}${this.leadZero(new Date().getDate())}_${this.leadZero(new Date().getHours())}${this.leadZero(new Date().getMinutes())}${this.leadZero(new Date().getSeconds())}.jpg`
      a.click()
    },
    saveSdp: function () {
      let a = document.createElement('a')
      a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify({
        options: this.options,
        layers: this.layers,
        snapshots: this.snapshots,
        state: {currentSnapshot: this.state.currentSnapshot},
        stamps: this.stamps.map(stamp => ({src: stamp.src}))
      }))
      a.download = `${new Date().getFullYear()}${this.leadZero(new Date().getMonth())}${this.leadZero(new Date().getDate())}_${this.leadZero(new Date().getHours())}${this.leadZero(new Date().getMinutes())}${this.leadZero(new Date().getSeconds())}.sdp`
      a.click()
    },
    uploadSdp: function (event) {
      if (event.target.files && event.target.files[0]) {
        const reader = new FileReader()
        reader.onload = e => {
          let content = JSON.parse(e.target.result)
          if (content.options) this.options = {...content.options}
          if (content.layers) this.layers = [...content.layers]
          if (content.stamps) this.stamps = [...content.stamps]
          if (content.state?.currentSnapshot) this.state.currentSnapshot = content.state?.currentSnapshot
          if (content.snapshots) this.snapshots = [...content.snapshots]
          this.$nextTick(() => {
            this.layers.forEach(layer => this.initializeCanvas(layer))
          })
        }
        reader.readAsText(event.target.files[0])
      }
    },
    jumpToSnapshot: function (index) {
      this.state.currentSnapshot = index
      this.options.canvasWidth = this.snapshots[index].canvas.width
      this.options.canvasHeight = this.snapshots[index].canvas.height
      this.layers = []
      this.$nextTick(() => {
        this.layers = [...this.snapshots[index].layers]
        if (!this.layers.find(layer => layer.id === this.activeLayer.id))
          this.activeLayer = this.layers[this.layers.length - 1]
        this.$nextTick(() => this.layers.forEach(layer => this.initializeCanvas(layer)))
      })
    },
    addImage: function (event) {
      if (event.target.files && event.target.files[0]) {
        const reader = new FileReader()
        reader.onload = e => {
          this.stamps.push({src: e.target.result})
          this.options.activeStamp = e.target.result
        }
        reader.readAsDataURL(event.target.files[0])
      }
    }
  },
  mounted() {
    this.init()
    window.onmouseup = this.mouseup
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-size: .9rem;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
canvas {
  display: block;
}

.editor {
  display: grid;
  grid-template-columns: 300px auto 1fr;
  grid-gap: 30px;
  padding: 30px;
  background: #FFFFFF;
  margin: 30px;
}

.panel, .layers, .options {
  background: #dddddd;
  padding: 20px;
}

select, input:not([type=checkbox]), button, .button {
  border-radius: 0;
  padding: 0 15px;
  height: 40px;
  border: 1px solid #dddddd;
  background: #FFFFFF;
  display: flex;
  align-items: center;
}
input[type=color] {
  padding: 0;
}

button {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  font-weight: bold;
}

.panel {
  grid-column: 1 / 4;
  display: flex;
  align-items: start;
  justify-content: space-between;
}

.panel > div {
  display: flex;
  flex-direction: column;
  margin-right: 1rem;
}
.panel > div small, .options > div small, form label{
  display: block;
  margin-bottom: .25rem;
}

.area {
  border: 1px solid #dddddd;
}

.area, #work-canvas {
  position: relative;
}

.layer-canvas {
  position: absolute;
}

.layer {
  background: #FFFFFF;
  position: relative;
  display: flex;
  justify-content: space-between;
}
.layer > div, a.unset {
  text-decoration: none;
  color: #2c3e50;
  display: block;
  padding: 20px;
}

.layer.active {
  font-weight: bold;
}

.layer.active::before {
  content: '';
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 2px;
  width: 5px;
  background: #dddddd;
}

.mb {
  margin-bottom: 1rem;
}
.mt {
  margin-top: .5rem;
}
.btn-colors {
  display: flex;
  flex-wrap: wrap;
  max-width: 125px;
}
.btn-colors button {
  width: 20px;
  padding: 0;
  height: 20px;
  margin: 0 5px 5px 0;
}
form {
  width: 300px;
  border: 1px solid #dddddd;
  padding: 30px;
  margin: 100px auto;
  background: #FFFFFF;
}
body {
  background: #dddddd;
}
.vertice {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1px solid #2c3e50;
  z-index: 10;
}
.vertice.top-left {
  top: -9px;
  left: -9px;
  cursor: nw-resize;
}
.vertice.top-right {
  top: -9px;
  right: -9px;
  cursor: ne-resize;
}
.vertice.bottom-left {
  bottom: -9px;
  left: -9px;
  cursor: ne-resize;
}
.vertice.bottom-right {
  bottom: -9px;
  right: -9px;
  cursor: nw-resize;
}
.panel input[type=color] {
  height: 20px;
}
button.active {
  border: 1px solid #2c3e50;
}
.btn-tools {
  display: flex;
}
.btn-tools button {
  margin: 0 5px 5px 0;
  font-weight: normal;
}
canvas.active {
  border: 1px dashed #2c3e50;
}
.block {
  display: block;
  width: 100%;
}
.layers-list {
  display: flex;
  flex-direction: column-reverse;
}
.btn-images {
  display: flex;
  flex-wrap: wrap;
  max-width: 300px;
}
.btn-images button {
  padding: 0;
  margin: 0 5px 5px 0;
}
.btn-images img {
  height: 38px;
}
</style>
