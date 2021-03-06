import React, { Component } from 'react'
import Section from '../../components/Section'
import Container from '../../components/Container'
import Form from '../../components/Form'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Web3 from 'web3'

class ImportEtherAccountPage extends Component {
  constructor(props) {
    super(props)
    this.state = {
      address: '',
      hasMetaMask: false
    }
  }

  componentDidMount() {
    const that = this
    const metamaskInterval = setInterval(function() {
      console.log('test')
      let address
      const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545')
      web3.eth.getAccounts().then(result => {
        address = result[0]
        if (address && address !== '') {
          that.setState({ address: address, hasMetaMask: true })
          clearInterval(metamaskInterval)
        }
      })
    }, 3000)
  }
  reConfirm = () => {
    const searchParams = new URLSearchParams(this.props.location.search)
    const code = searchParams.get('code') ? searchParams.get('code') : ''
    const channel = searchParams.get('channel')
      ? searchParams.get('channel')
      : ''
    this.props.history.push(
      `/binduseraccount?address=${
        this.state.address
      }&code=${code}&channel=${channel}`
    )
  }
  handleChange = e => {
    const { target } = e
    const { name, value } = target

    this.setState({
      [name]: value
    })
  }
  render() {
    return (
      <Container>
        <Section padded>
          <Form onSubmit={this.handleSubmit}>
            <h3>请填写以太坊账户地址</h3>

            {this.state.hasMetaMask ? (
              <p>
                检测到MetaMask账户,已自动填入
                <small>(切换账户后请刷新本页)</small>
              </p>
            ) : (
              ''
            )}
            <Form.Item>
              <Input
                type="text"
                name="address"
                placeholder="以太坊账户地址"
                value={this.state.address}
                onChange={this.handleChange}
                required
              />
            </Form.Item>
            <Form.Item>
              <Button primary fullWidth onClick={this.reConfirm}>
                确定
              </Button>
            </Form.Item>
          </Form>
          <small>支持登录MetaMask，获取已有账户地址</small>
        </Section>
      </Container>
    )
  }
}
export default ImportEtherAccountPage
