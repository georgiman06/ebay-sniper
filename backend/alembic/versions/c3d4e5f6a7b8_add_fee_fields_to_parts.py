"""add_fee_fields_to_parts

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-02

"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tracked_parts', sa.Column('ebay_fee_override', sa.Float(), nullable=True))
    op.add_column('tracked_parts', sa.Column('outbound_shipping', sa.Float(), nullable=True))


def downgrade():
    op.drop_column('tracked_parts', 'outbound_shipping')
    op.drop_column('tracked_parts', 'ebay_fee_override')
