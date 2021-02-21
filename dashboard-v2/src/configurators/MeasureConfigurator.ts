import { ref } from "vue"
import { PersistentStateManager } from "../PersistentStateManager"
import { loadJson } from "../util/httpUtil"
import { toMutableArray, DataQuery, DataQueryConfigurator, DataQueryExecutorConfiguration, ServerConfigurator } from "../dataQuery"
import { debounce } from "../util/debounce"

export class MeasureConfigurator implements DataQueryConfigurator {
  public readonly data = ref<Array<string>>([])
  public readonly value = ref<Array<string>>([])

  private readonly debouncedLoad = debounce(() => this.load())

  constructor(private readonly serverConfigurator: ServerConfigurator,
              persistentStateManager: PersistentStateManager,
              private readonly skipZeroValues: boolean = true) {
    persistentStateManager.add("metrics", this.value)
  }

  configure(query: DataQuery, configuration: DataQueryExecutorConfiguration): boolean {
    const values = toMutableArray(this.value.value)
    if (values.length === 0) {
      return false
    }

    // predictable order of series (UI) and fields in query (caching)
    values.sort()

    query.addField({
      name: "t",
      sql: "toUnixTimestamp(generated_time) * 1000"
    })

    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      query.addField(value)
      if (this.skipZeroValues) {
        query.addFilter({field: value, operator: "!=", value: 0})
      }

      configuration.series.push({
        name: value,
        type: "line",
        smooth: 1,
        showSymbol: false,
        legendHoverLink: true,
        sampling: "lttb",
        encode: {
          // index if time
          x: 0,
          // +1 because time is the 0-dimension
          y: i + 1,
          tooltip: [i + 1, 0],
        },
      })
    }
    if (query.order != null) {
      throw new Error("order must be configured only by MetricLoader")
    }
    query.order = ["t"]
    return true
  }

  scheduleLoad(): void {
    this.debouncedLoad()
  }

  load(): void {
    const server = this.serverConfigurator.server.value
    if (server == null || server.length === 0) {
      return
    }

    loadJson<Array<string>>(`${server}/api/v1/meta/measure?db=${this.serverConfigurator.databaseName}`, null, data => {
      this.data.value = data
    })
  }
}