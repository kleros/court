import { Button, Cascader, Col, Modal, Row, Skeleton } from 'antd'
import React, { useCallback, useState } from 'react'
import Breadcrumbs from '../components/breadcrumbs'
import PropTypes from 'prop-types'
import ReactMarkdown from 'react-markdown'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'
import { useDrizzle } from '../temp/drizzle-react-hooks'

const StyledModal = styled(Modal)`
  .ant-modal {
    &-header {
      padding: 0;
    }

    &-close-icon svg {
      fill: white;
    }

    &-body {
      height: 320px;
      position: relative;
    }

    &-footer {
      height: 250px;
      overflow-y: scroll;
      padding: 18px 42px 28px;
      text-align: left;
    }
  }
`
const StyledDiv = styled.div`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
`
const StyledTitleDiv = styled.div`
  color: white;
  font-size: 20px;
  font-weight: bold;
  height: 54px;
  line-height: 54px;
  text-align: center;
`
const StyledCascader = styled(Cascader)`
  display: none;

  & ~ div .popupClassName {
    background: whitesmoke;
    left: 0 !important;
    top: 0 !important;
    width: 100%;

    .ant-cascader-menu {
      height: 320px;
      padding-top: 28px;
      width: 135px;

      &-item {
        height: 38px;
        padding-left: 18px;
      }
    }
  }
`
const StyledBreadcrumbs = styled(Breadcrumbs)`
  left: ${props => props.colorIndex * 135}px;
  position: absolute;
  top: ${props => props.columnIndex * 38 + 28}px;
  z-index: ${props => props.optionLength - props.colorIndex + 2000};
`
const CourtCascaderModal = ({ onClick }) => {
  const { useCacheCall } = useDrizzle()
  const load = useDataloader()
  const [subcourtIDs, setSubcourtIDs] = useState(['0'])
  const options = useCacheCall(['PolicyRegistry', 'KlerosLiquid'], call => {
    const options = [
      {
        children: undefined,
        description: undefined,
        label: undefined,
        loading: false,
        summary: undefined,
        value: subcourtIDs[0]
      }
    ]
    let option = options[0]
    for (let i = 0; i < subcourtIDs.length; i++) {
      const policy = call('PolicyRegistry', 'policies', subcourtIDs[i])
      if (policy) {
        const policyJSON = load(policy.fileURI)
        if (policyJSON) {
          option.description = policyJSON.description
          option.label = policyJSON.name
          option.summary = policyJSON.summary
        }
      }
      const subcourt = call('KlerosLiquid', 'getSubcourt', subcourtIDs[i])
      if (subcourt)
        option.children = subcourt.children.map(c => {
          const child = {
            children: undefined,
            description: undefined,
            label: undefined,
            loading: false,
            summary: undefined,
            value: c
          }
          const policy = call('PolicyRegistry', 'policies', c)
          if (policy) {
            const policyJSON = load(policy.fileURI)
            if (policyJSON) {
              child.description = policyJSON.description
              child.label = policyJSON.name
              child.summary = policyJSON.summary
            }
          }
          if (child.label === undefined) child.loading = true
          return child
        })
      if (
        option.label === undefined ||
        subcourt === undefined ||
        option.children.some(c => c.loading)
      ) {
        option.loading = true
        break
      }
      option = option.children.find(c => c.value === subcourtIDs[i + 1])
    }
    return options
  })
  const option = subcourtIDs.reduce((acc, ID, i) => {
    const index = acc.findIndex(option => option.value === ID)
    return i === subcourtIDs.length - 1
      ? {
          description: acc[index].description,
          loading: acc[index].loading,
          summary: acc[index].summary
        }
      : acc[index].children
  }, options)
  return (
    <StyledModal
      centered
      footer={
        <Skeleton active loading={option.loading}>
          {
            <Row>
              <Col span={12}>
                <StyledDiv>Description</StyledDiv>
                <ReactMarkdown source={option.description} />
              </Col>
              <Col span={12}>
                <StyledDiv>Summary</StyledDiv>
                <ReactMarkdown source={option.summary} />
              </Col>
            </Row>
          }
        </Skeleton>
      }
      onCancel={useCallback(() => onClick(), [onClick])}
      title={
        <StyledTitleDiv className="secondary-linear-background theme-linear-background">
          Select Court{' '}
          <Button
            onClick={useCallback(
              () => onClick(subcourtIDs[subcourtIDs.length - 1]),
              [onClick]
            )}
            size="small"
            type="primary"
          >
            Stake
          </Button>
        </StyledTitleDiv>
      }
      visible
      width="90%"
    >
      <StyledCascader
        changeOnSelect
        getPopupContainer={useCallback(
          () => document.getElementsByClassName('ant-modal-body')[0],
          []
        )}
        onChange={setSubcourtIDs}
        options={options}
        popupClassName="popupClassName"
        popupVisible
        value={subcourtIDs}
      />
      {subcourtIDs.slice(0, subcourtIDs.length - 1).map((ID, i) => {
        const subcourtIDsSubset = subcourtIDs.slice(
          0,
          subcourtIDs.indexOf(ID) + 1
        )
        const option = subcourtIDsSubset.reduce((acc, ID, i) => {
          const index = acc.findIndex(option => option.value === ID)
          return i === subcourtIDsSubset.length - 1
            ? { index, label: acc[index].label || '' }
            : acc[index].children
        }, options)
        return (
          <StyledBreadcrumbs
            breadcrumbs={option.label}
            colorIndex={i}
            columnIndex={option.index}
            key={`${ID}-${i}`}
            large
            optionLength={subcourtIDs.length}
          />
        )
      })}
    </StyledModal>
  )
}

CourtCascaderModal.propTypes = {
  onClick: PropTypes.func.isRequired
}

export default CourtCascaderModal
