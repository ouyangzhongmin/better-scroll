<template>
  <div class="infinity">
    <div class="template">
      <li ref="message" class="infinity-item">
        <img class="infinity-avatar" width="48" height="48">
        <div class="infinity-bubble">
          <p></p>
          <img width="300" height="300">
          <div class="infinity-meta">
            <time class="infinity-posted-date"></time>
          </div>
        </div>
      </li>
      <li ref="tombstone" class="infinity-item tombstone">
        <img class="infinity-avatar" width="48" height="48" :src="require('./image/unknown.jpg')">
        <div class="infinity-bubble">
          <p></p>
          <p></p>
          <p></p>
          <div class="infinity-meta">
            <time class="infinity-posted-date"></time>
          </div>
        </div>
      </li>
    </div>

    <div v-show="beforePullDown">
      <span>Pull Down and refresh</span>
    </div>
    <div v-show="!beforePullDown">
      <div v-show="isPullingDown">
        <span>Loading...</span>
      </div>
      <div v-show="!isPullingDown">
        <span>Refresh success</span>
      </div>
    </div>

    <div ref="chat" class="infinity-timeline">
      <ul>
      </ul>
    </div>

    <div class="pullup-tips">
      <div v-if="!isPullUpLoad" class="before-trigger">
        <span class="pullup-txt">Pull up and load more</span>
      </div>
      <div v-else class="after-trigger">
        <span class="pullup-txt">Loading...</span>
      </div>
    </div>

  </div>
</template>

<script>
  import BScroll from '@better-scroll/core'
  import InfinityScroll from '../../../../infinity/src'
  import Pullup from '@better-scroll/pull-up'
  import PullDown from '@better-scroll/pull-down'
  import EvemtEmitter3 from 'eventemitter3'
  import message from './data/message.json'
  BScroll.use(Pullup)
  BScroll.use(PullDown)
  BScroll.use(InfinityScroll)


  const TIME_BOUNCE = 800
  const THRESHOLD = 70
  const STOP = 56
  const NUM_AVATARS = 4
  const NUM_IMAGES = 77
  const INIT_TIME = new Date().getTime()
  let STEP = 0

  function getItem(id) {
    function pickRandom(a) {
      return a[Math.floor(Math.random() * a.length)]
    }

    return new Promise(function (resolve) {
      let item = {
        id: id,
        avatar: Math.floor(Math.random() * NUM_AVATARS),
        self: Math.random() < 0.1,
        image: Math.random() < 1.0 / 20 ? Math.floor(Math.random() * NUM_IMAGES) : '',
        time: new Date(Math.floor(INIT_TIME + id * 20 * 1000 + Math.random() * 20 * 1000)),
        message: pickRandom(message)
      }
      if (item.image === '') {
        resolve(item)
      } else {
        let image = new Image()
        image.src = require(`./image/image${item.image}.jpg`)
        image.addEventListener('load', function () {
          item.image = image
          resolve(item)
        })
        image.addEventListener('error', function () {
          item.image = ''
          resolve(item)
        })
      }
    })
  }

  export default {
    name: 'infinity',
    created() {
      this.nextItem = 0
      this.pageNum = 0
      this.isPullUpLoad = false
      this.beforePullDown= true
      this.isPullingDown= false
      this.fetchDataStatus = 0
      this.event = new EvemtEmitter3()
    },
    mounted() {
      this.createInfinityScroll()
    },
    methods: {
      createInfinityScroll() {
        this.scroll = new BScroll(this.$refs.chat, {
          pullUpLoad: true,
          pullDownRefresh: {
            threshold: THRESHOLD,
            stop: STOP
          },
          infinity: {
            render: (item, div) => {
              console.log("render:::::", item)
              div = div || this.$refs.message.cloneNode(true)
              div.dataset.id = item.id
              div.querySelector('.infinity-avatar').src = require(`./image/avatar${item.avatar}.jpg`)
              div.querySelector('.infinity-bubble p').textContent = item.id + '  ' + item.message
              div.querySelector('.infinity-bubble .infinity-posted-date').textContent = item.time.toString()

              let img = div.querySelector('.infinity-bubble img')
              if (item.image !== '') {
                img.style.display = ''
                img.src = item.image.src
                img.width = item.image.width
                img.height = item.image.height
              } else {
                img.src = ''
                img.style.display = 'none'
              }

              if (item.self) {
                div.classList.add('infinity-from-me')
              } else {
                div.classList.remove('infinity-from-me')
              }
              return div
            },
            createTombstone: () => {
              return this.$refs.tombstone.cloneNode(true)
            },
            fetch: (count) => {
              // Fetch at least 30 or count more objects for display.
              count = Math.max(10, count)
              count = 20
              return new Promise((resolve, reject) => {
                // Assume 50 ms per item.
                setTimeout(() => {
                  if (++this.pageNum > 10 ) {
                    resolve(false)
                    this.fetchDataStatus = -1
                  } else {

                    let items = []
                    for (let i = 0; i < Math.abs(count); i++) {
                      items[i] = getItem(this.nextItem++)
                    }
                    console.log('pageNum', this.pageNum, count, items.length)
                    // console.log("items::::", count, items.length)
                    resolve(Promise.all(items))
                    this.fetchDataStatus = 1
                  }
                  this.event.emit("fetchData", "msg")
                }, 3000)
              })
            }
          }
        })
        this.scroll.on('scroll', () => {
          console.log('is scrolling')
        })
        this.scroll.on('scrollEnd', () => {
          console.log('scrollEnd')
        })
        this.scroll.on('pullingUp',() => {
          this.isPullUpLoad = true
          console.log("isPullUpLoad")
          document.getElementsByClassName("pullup-tips")[0].style.display = "block";
          this.event.once('fetchData',(msg) => {
            this.scroll.finishPullUp()
            if (this.pageNum > 1){
              this.scroll.scrollBy(0, -80,400)
            }
            this.isPullUpLoad = false
            console.log("finishPullUp!!!!!!!!!!!!!!!!", this.fetchDataStatus)
            document.getElementsByClassName("pullup-tips")[0].style.display = "none";
          })
        })
        this.scroll.on('pullingDown', async () => {
          console.log('trigger pullDown')
          this.beforePullDown = false
          this.isPullingDown = true
          STEP += 1
          this.event.once('refreshData', (newDatas) => {
            this.isPullingDown = false
            this.beforePullDown = true
            this.scroll.finishPullDown()
            console.log("finishPullDown!!!!!!!!!!!!!!!!",newDatas.length, newDatas)
            if (newDatas.length >0){
              setTimeout(() => {
                this.scroll.resetInfinityState(newDatas)
                this.scroll.refresh()
              }, TIME_BOUNCE )
            }
          })
          let newDatas =  await this.requestFirstPageData()
          this.event.emit("refreshData", newDatas)

        })
      },
      async requestFirstPageData() {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (false) {
             resolve([])
            } else {
              this.pageNum = 1
              let items = []
              for (let i = 0; i < Math.abs(20); i++) {
                items[i] = getItem(this.nextItem++)
              }
              console.log('pageNum', this.pageNum, 20, items.length)
              resolve(Promise.all(items))
            }
          }, 2000)
        })
      }
    }
  }
</script>

<style lang="stylus" scoped>
  .infinity
    height: 100%
    .template
      display: none

  .infinity-timeline
    position: relative
    height: 100%
    padding: 0 10px
    border: 1px solid #ccc
    overflow: hidden
    will-change: transform
    background-color: #efeff5

  .infinity-timeline > ul
    position: relative
    -webkit-backface-visibility: hidden
    -webkit-transform-style: flat

  .infinity-item
    display: flex
    left: 0
    padding: 10px 0
    width: 100%
    contain: layout
    will-change: transform
    list-style: none

  .infinity-avatar
    border-radius: 500px
    margin-left: 20px
    margin-right: 6px
    min-width: 48px

  .infinity-item
    p
      margin: 0
      word-wrap: break-word
      font-size: 13px

  .infinity-item.tombstone
    p
      width: 100%
      height: 0.5em
      background-color: #ccc
      margin: 0.5em 0

  .infinity-bubble img
    max-width: 100%
    height: auto

  .infinity-bubble
    padding: 7px 10px
    color: #333
    background: #fff
    /*box-shadow: 0 3px 2px rgba(0, 0, 0, 0.1)*/
    position: relative
    max-width: 420px
    min-width: 80px
    margin: 0 5px

  .infinity-bubble::before
    content: ''
    border-style: solid
    border-width: 0 10px 10px 0
    border-color: transparent #fff transparent transparent
    position: absolute
    top: 0
    left: -10px

  .infinity-meta
    font-size: 0.8rem
    color: #999
    margin-top: 3px

  .infinity-from-me
    justify-content: flex-end

  .infinity-from-me .infinity-avatar
    order: 1
    margin-left: 6px
    margin-right: 20px

  .infinity-from-me .infinity-bubble
    background: #F9D7FF

  .infinity-from-me .infinity-bubble::before
    left: 100%
    border-width: 10px 10px 0 0
    /*border-color: #F9D7FF transparent transparent transparent*/

  .infinity-state
    display: none

  .infinity-invisible
    display: none

  .pullup-tips
    padding: 20px
    text-align: center
    color: #999
    background: rgba(0,0,0,0.1);
    width: 100%
    bottom :0
    position: absolute;
    display none;
</style>
