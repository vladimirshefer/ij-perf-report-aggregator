import { SubDimensionConfigurator } from "./DimensionConfigurator"
import { computed, ComputedRef, Ref, ref, UnwrapRef, watch } from "vue"
import { PersistentStateManager } from "../PersistentStateManager"
import { DataQuery, DataQueryConfigurator, DataQueryExecutorConfiguration, toArray } from "../dataQuery"

const valueToGroup: { [key: string]: string } = getValueToGroup()

export class MachineConfigurator implements DataQueryConfigurator {
  public readonly value = ref<string | Array<string>>("")
  public readonly values = ref<Array<GroupedDimensionValue>>([])

  public readonly loading: ComputedRef<Ref<UnwrapRef<boolean>>>
  private readonly groupNameToItem = new Map<string, GroupedDimensionValue>()

  constructor(dimension: SubDimensionConfigurator, persistentStateManager: PersistentStateManager) {
    persistentStateManager.add("machine", this.value)

    this.loading = computed(() => dimension.loading)

    watch(dimension.values, (values) => {
      let groupName = ""
      const grouped: Array<GroupedDimensionValue> = []
      this.groupNameToItem.clear()
      for (const value of values) {
        if (value.startsWith("intellij-linux-hw-blade-")) {
          groupName = "linux-blade"
        }
        else {
          groupName = valueToGroup[value]
          if (groupName == null) {
            groupName = value
            console.error(`Group is unknown for machine: ${value}`)
          }
        }

        let item = this.groupNameToItem.get(groupName)
        if (item == null) {
          item = {
            value: groupName,
            children: [],
          }
          grouped.push(item)
          this.groupNameToItem.set(groupName, item)
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        item.children!.push({value})
      }
      grouped.sort((a, b) => a.value.localeCompare(b.value))
      this.values.value = grouped
    })
  }

  configure(query: DataQuery, _configuration: DataQueryExecutorConfiguration): boolean {
    const values: Array<string> = []
    for (const value of toArray(this.value.value)) {
      const groupItem = this.groupNameToItem.get(value)
      if (groupItem == null) {
        values.push(value)
      }
      else {
        // it's group
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const child of groupItem.children!) {
          values.push(child.value)
        }
      }
    }
    if (values.length > 0) {
      query.addFilter({field: "machine", value: values})
    }
    return true
  }
}

export interface GroupedDimensionValue {
  value: string
  children?: Array<GroupedDimensionValue>
}

function getValueToGroup() {
  // Mac mini Space Gray/3.0 GHz 6C/8GB/256GB
  const macMini = "macMini 2018"

  // Mac Mini M1 Chip with 8‑Core CPU und 8‑Core GPU, SSD 256Gb, RAM 16Gb
  const macMiniM1 = "macMini M1 2020"

  // Core i7-3770 16Gb, Intel SSD 535
  const win = "Windows: i7-3770, 16Gb, Intel SSD 535"

  // old RAM	RAM	RAM type	CPU	CPU CLOCK	MotherBoard	HDDs

  // 16384 Mb	16384 Mb	2xDDR3-12800 1600MHz 8Gb(8192Mb)	Core i7-3770	3400 Mhz	Intel DH77EB	240 Gb
  const linux = "Linux: i7-3770, 16Gb (12800 1600MHz), SSD"

  // 16384 Mb	16384 Mb	2xDDR3-10600 1333MHz 8Gb(8192Mb)	Core i7-3770	3400 Mhz	Intel DH77EB	240 Gb
  const linux2 = "Linux: i7-3770, 16Gb (10600 1333MHz), SSD"

  return {
    "intellij-macos-hw-unit-1550": macMini,
    "intellij-macos-hw-unit-1551": macMini,
    "intellij-macos-hw-unit-1772": macMini,
    "intellij-macos-hw-unit-1773": macMini,

    "intellij-macos-hw-unit-2204": macMiniM1,
    "intellij-macos-hw-unit-2205": macMiniM1,

    "intellij-windows-hw-unit-498": win,
    "intellij-windows-hw-unit-499": win,
    "intellij-windows-hw-unit-449": win,
    "intellij-windows-hw-unit-463": win,
    "intellij-windows-hw-unit-493": win,
    "intellij-windows-hw-unit-504": win,

    "intellij-linux-hw-unit-449": linux,
    "intellij-linux-hw-unit-499": linux,
    "intellij-linux-hw-unit-450": linux,
    "intellij-linux-hw-unit-463": linux2,
    "intellij-linux-hw-unit-484": linux,

    // error in info table - only 16GB ram and not 32
    "intellij-linux-hw-unit-493": linux,

    "intellij-linux-hw-unit-504": linux,
    "intellij-linux-hw-unit-531": linux,
    "intellij-linux-hw-unit-534": linux,
    "intellij-linux-hw-unit-556": linux,
    "intellij-linux-hw-unit-558": linux,
  }
}