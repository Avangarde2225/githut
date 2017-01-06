import React from 'react'
import axios from 'axios'
import pullRequests from '../../data/gh-pull-request.json'
import { filter, sortBy, reverse, toString, omitBy, isNil, first, assign, take, includes, reject, pick, map, split } from 'lodash/fp'
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table'
import { NonLangStore } from '../stores/NonLangStore'

export default class LangTable extends React.Component {

    constructor() {
        super()
        this.options = {
            defaultSortName: 'count',
            defaultSortOrder: 'asc'
        };
        this.state = {
            data: []
        };
    }

    parseJSON(data) {
        return data
          | split('\n')
          | map(JSON.parse)
    }

    latestDate(data) {
        return data
          | map(pick(['year', 'quarter']))
          | sortBy(['year', 'quarter'])
          | reverse
          | first
    }

    filterDate(data, year, quarter) {
        const nonLang = new NonLangStore().getConfig()
        return data
          | filter({year: year})
          | filter({quarter: quarter})
          | map(pick(['name', 'count']))
          | reject(o => includes(o.name)(nonLang.lang))
          | map.convert({'cap':0})((o, i) => assign({id: ++i})(o))
    }

    trendFormatter(cell, row) {
        const arrow = n => {
            const angle = dir => `<i class='fa fa-angle-${dir}'></i>`
            switch (true) {
                case n == 0:
                    return ''
                case n > 3:
                    return angle('double-up')
                case n < -3:
                    return angle('double-down')
                case n < 0:
                    return angle('down')
                case n > 0:
                    return angle('up')
                default:
                    return 'error'
                }
            }
        return `${arrow(cell)}`
    }

    getTrend(current, last) {
        return current
          | map(cur => {
              const l = last
                | filter({ name: cur.name })
                | first
                | omitBy(isNil)
              return assign({ trend: l.id - cur.id })(cur)
            })
          | take(50)
    }

    async componentDidMount() {
        const { data } = await axios.get(pullRequests)
        const d = data | this.parseJSON
        const { year, quarter } = d | this.latestDate
        const dec = i => --i | toString
        const curYearRanking = this.filterDate(d, year, quarter)
        const lastYearRanking = this.filterDate(d, dec(year), quarter)
        const langRanking = this.getTrend(curYearRanking, lastYearRanking)
        this.setState({data: langRanking})
    }

    render() {
        return (
            <BootstrapTable
                condensed
                tableStyle={ { margin: '30px auto 30px auto', width: '50%' } }
                data={this.state.data}
                bordered={false}
                options={this.options}>
                <TableHeaderColumn
                    width='150px'
                    dataAlign='center'
                    dataField='id'
                    isKey={true}
                    dataSort>
                    # Ranking
                </TableHeaderColumn>
                <TableHeaderColumn
                    dataAlign="center"
                    dataField='name'>
                    Programming Language
                </TableHeaderColumn>
                <TableHeaderColumn
                    dataAlign="center"
                    dataField='trend'
                    dataFormat={ this.trendFormatter }>
                    Trend
                </TableHeaderColumn>
            </BootstrapTable>
        )
    }
}
