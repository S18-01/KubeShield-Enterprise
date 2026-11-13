
resource "aws_default_security_group" "restricted" {
  vpc_id = aws_vpc.main.id

  ingress = []
  egress  = []

  tags = {
    Name = "${local.name}-default-sg-restricted"
  }
}
