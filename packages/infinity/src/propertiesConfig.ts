const sourcePrefix = 'plugins.infinity'

const propertiesMap = [
  {
    key: 'resetInfinityState',
    name: 'resetInfinityState'
  }
]

export default propertiesMap.map(item => {
  return {
    key: item.key,
    sourceKey: `${sourcePrefix}.${item.name}`
  }
})
